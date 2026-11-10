/**
 * Full-page screenshot capture for the fidelity harness. Works against the live site (reference) and the
 * local Next.js app (candidate) with the same freeze logic.
 *
 *   pnpm fidelity:capture --routes / --viewports 1440          # quick check
 *   pnpm fidelity:capture --tier 1                              # one route per template, all viewports
 *   pnpm fidelity:capture --tier all --viewports 1440,390       # every route in content/routes.json
 *   pnpm fidelity:capture --base http://localhost:3000 --out fidelity/current --tier 1
 *
 * Uses the system Google Chrome (no browser download). Low concurrency on purpose — the live site is
 * production.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { VIEWPORTS, VIEWPORT_HEIGHT } from '../lib/viewports';
import { installBrowserShims, installHeroVideoCorsFix, prepare, routeToSlug, type PrepareResult } from '../lib/freeze';
import { TIER1 } from '../lib/tiers';
import { cropToWidth } from '../lib/image';

type Args = { base: string; out: string; widths: number[]; routes: string[]; concurrency: number; heroFix: boolean };

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const base = (get('--base') ?? 'https://techversantinfotech.com').replace(/\/$/, '');
  const out = get('--out') ?? 'fidelity/reference';
  const widths = (get('--viewports') ?? VIEWPORTS.join(',')).split(',').map((n) => Number(n.trim()));
  const concurrency = Number(get('--concurrency') ?? 2);
  const explicit = get('--routes');
  const tier = get('--tier') ?? '1';
  return {
    base,
    out,
    widths,
    concurrency,
    heroFix: !argv.includes('--no-hero-fix') && /techversantinfotech\.com/.test(base),
    routes: explicit ? explicit.split(',').map((r) => r.trim()) : tier === 'all' ? [] : TIER1,
  };
}

async function loadAllRoutes(): Promise<string[]> {
  const raw = JSON.parse(await fs.readFile(path.resolve('content/routes.json'), 'utf8')) as { routes: { path: string }[] };
  return raw.routes.map((r) => r.path);
}

type Entry = {
  route: string;
  width: number;
  file: string;
  status: number | null;
  title: string;
  overflowX: number;
  prepare: PrepareResult;
  ms: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.routes.length === 0) args.routes = await loadAllRoutes();

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const chromeVersion = browser.version();
  const outDir = path.resolve(args.out);
  await fs.mkdir(outDir, { recursive: true });

  let tasks = args.routes.flatMap((route) => args.widths.map((width) => ({ route, width })));
  if (process.argv.includes('--skip-existing')) {
    const exists = await Promise.all(tasks.map((t) => fs.access(path.join(outDir, routeToSlug(t.route), `${t.width}.png`)).then(() => true, () => false)));
    const before = tasks.length;
    tasks = tasks.filter((_, i) => !exists[i]);
    console.log(`--skip-existing: ${before - tasks.length} already captured, ${tasks.length} to go`);
  }
  console.log(`capture ${tasks.length} screenshots (${args.routes.length} routes x ${args.widths.length} viewports) from ${args.base} -> ${args.out} | chrome ${chromeVersion}`);

  const entries: Entry[] = [];
  let next = 0;

  async function worker(id: number) {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      const { route, width } = tasks[i];
      const t0 = Date.now();
      const ctx = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'en-US' });
      await installBrowserShims(ctx);
      const page = await ctx.newPage();
      try {
        if (args.heroFix) await installHeroVideoCorsFix(page);
        const resp = await page.goto(new URL(route, args.base).href, { waitUntil: 'load', timeout: 90_000 });
        await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
        const prep = await prepare(page);
        const file = path.join(outDir, routeToSlug(route), `${width}.png`);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
        const overflowX = await cropToWidth(file, width);
        const entry: Entry = { route, width, file: path.relative(outDir, file), status: resp?.status() ?? null, title: await page.title(), overflowX, prepare: prep, ms: Date.now() - t0 };
        entries.push(entry);
        console.log(`[w${id}] ${String(width).padStart(4)} ${route.padEnd(58)} h=${prep.docHeight} img=${prep.imagesTotal}/${prep.imagesBroken} broken, swipers=${prep.swipers}, video=${prep.videos.map((v) => `rs${v.ready}`).join(',') || '-'} (${entry.ms} ms)`);
      } catch (e) {
        console.error(`[w${id}] FAIL ${width} ${route}: ${(e as Error).message.split('\n')[0]}`);
      } finally {
        await ctx.close();
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, (_, i) => worker(i + 1)));
  await browser.close();

  // merge into the manifest (keeps earlier captures)
  const manifestFile = path.join(outDir, 'manifest.json');
  let prev: { entries?: Entry[] } = {};
  try {
    prev = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  } catch {
    /* first run */
  }
  const key = (e: Pick<Entry, 'route' | 'width'>) => `${e.route}@${e.width}`;
  const merged = new Map((prev.entries ?? []).map((e) => [key(e), e]));
  for (const e of entries) merged.set(key(e), e);
  await fs.writeFile(
    manifestFile,
    JSON.stringify({ base: args.base, chrome: chromeVersion, capturedAt: new Date().toISOString(), entries: [...merged.values()].sort((a, b) => key(a).localeCompare(key(b))) }, null, 2) + '\n',
  );
  console.log(`done: ${entries.length}/${tasks.length} captured. manifest: ${path.relative(process.cwd(), manifestFile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
