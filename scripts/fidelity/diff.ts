/**
 * Pixel-diff harness: compares candidate screenshots (fidelity/current, from the local Next.js app) against
 * the frozen reference (fidelity/reference, from the live site) and writes
 *   fidelity/diff/<route>/<width>.png   red = differing pixels over a faded copy of the reference
 *   fidelity/STATUS.md                  route x viewport matrix with pass/fail and the worst bands
 *
 *   pnpm fidelity:diff                         # every route/viewport present in both folders
 *   pnpm fidelity:diff --routes /,/who-we-are/ --viewports 1440
 *
 * Gate (from the approved plan): page height within +-2px and every 600px band <= 0.5% differing pixels.
 */
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { routeToSlug } from '../lib/freeze';

const argv = process.argv.slice(2);
const arg = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
// --ref accepts a comma-separated list of reference folders; the first one that has the file wins
// (e.g. `fidelity/ref-new,fidelity/reference` while references are being refreshed).
const REFS = (arg('--ref') ?? 'fidelity/ref-new,fidelity/reference').split(',').map((d) => path.resolve(d.trim()));
const CUR = path.resolve(arg('--cur') ?? 'fidelity/current');
const OUT = path.resolve(arg('--out') ?? 'fidelity/diff');
const BAND = 600;
const MAX_BAND_PCT = 0.5;
const MAX_HEIGHT_DELTA = 2;

type Band = { y: number; h: number; pct: number };
type Result = { route: string; width: number; refH: number; curH: number; heightDelta: number; pct: number; worst: Band[]; pass: boolean };

async function readPng(file: string) {
  return PNG.sync.read(await fs.readFile(file));
}

async function compare(route: string, width: number): Promise<Result | null> {
  const slug = routeToSlug(route);
  const refFile = [...REFS.map((d) => path.join(d, slug, `${width}.png`))].find((f) => existsSync(f)) ?? path.join(REFS[REFS.length - 1], slug, `${width}.png`);
  const curFile = path.join(CUR, slug, `${width}.png`);
  let a: PNG, b: PNG;
  try {
    [a, b] = await Promise.all([readPng(refFile), readPng(curFile)]);
  } catch {
    return null;
  }
  if (a.width !== b.width) throw new Error(`${route}@${width}: width mismatch ${a.width} vs ${b.width}`);
  const heightDeltaFull = b.height - a.height;
  // --head N / --tail N: compare only the first / last N rows (e.g. the header or the footer region).
  const head = Number(arg('--head') ?? 0);
  const tail = Number(arg('--tail') ?? 0);
  const from = Number(arg('--from') ?? -1);
  const to = Number(arg('--to') ?? 0);
  const region = (img: PNG) => {
    if (from >= 0 && to > from) {
      // --from Y --to Y: compare only rows [from, to) (one section of the page).
      const hh = Math.min(to, img.height) - from;
      const o = new PNG({ width: img.width, height: Math.max(1, hh) });
      PNG.bitblt(img, o, 0, from, img.width, Math.max(1, hh), 0, 0);
      return o;
    }
    const n = head || tail;
    if (!n || img.height <= n) return img;
    const y0 = head ? 0 : img.height - n;
    const out = new PNG({ width: img.width, height: n });
    PNG.bitblt(img, out, 0, y0, img.width, n, 0, 0);
    return out;
  };
  if (head || tail || from >= 0) {
    a = region(a);
    b = region(b);
  }
  const w = a.width;
  const h = Math.min(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  const bands: Band[] = [];
  let total = 0;
  for (let y = 0; y < h; y += BAND) {
    const bh = Math.min(BAND, h - y);
    const rows = (img: PNG) => img.data.subarray(y * w * 4, (y + bh) * w * 4);
    const out = new Uint8Array(w * bh * 4);
    const n = pixelmatch(rows(a), rows(b), out, w, bh, { threshold: 0.1, includeAA: false, alpha: 0.25, diffColor: [255, 0, 0] });
    diff.data.set(out, y * w * 4);
    total += n;
    bands.push({ y, h: bh, pct: (n / (w * bh)) * 100 });
  }
  await fs.mkdir(path.join(OUT, slug), { recursive: true });
  await fs.writeFile(path.join(OUT, slug, `${width}.png`), PNG.sync.write(diff));
  const heightDelta = head || tail || from >= 0 ? 0 : heightDeltaFull;
  const worst = [...bands].sort((p, q) => q.pct - p.pct).slice(0, 3);
  const pass = Math.abs(heightDelta) <= MAX_HEIGHT_DELTA && bands.every((x) => x.pct <= MAX_BAND_PCT);
  return { route, width, refH: a.height, curH: b.height, heightDelta, pct: (total / (w * h)) * 100, worst, pass };
}

async function main() {
  const entries = new Map<string, { route: string; width: number }>();
  for (const dir of [...REFS].reverse()) {
    const m = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8').catch(() => '{"entries":[]}')) as { entries: { route: string; width: number }[] };
    for (const e of m.entries) entries.set(`${e.route}@${e.width}`, e);
  }
  const manifest = { entries: [...entries.values()] };
  const routeFilter = arg('--routes')?.split(',').map((s) => s.trim());
  const widthFilter = arg('--viewports')?.split(',').map(Number);
  const jobs = manifest.entries.filter((e) => (!routeFilter || routeFilter.includes(e.route)) && (!widthFilter || widthFilter.includes(e.width)));

  const results: Result[] = [];
  let missing = 0;
  for (const j of jobs) {
    const r = await compare(j.route, j.width);
    if (!r) {
      missing++;
      continue;
    }
    results.push(r);
    const w = r.worst[0];
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${String(r.width).padStart(4)} ${r.route.padEnd(58)} diff ${r.pct.toFixed(2).padStart(6)}%  dH ${String(r.heightDelta).padStart(5)}  worst band y=${w.y} ${w.pct.toFixed(1)}%`);
  }
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} pass, ${results.filter((r) => !r.pass).length} fail, ${missing} not yet built (no candidate screenshot)`);

  // STATUS.md — one row per route, one column per viewport
  const widths = [...new Set(jobs.map((j) => j.width))].sort((x, y) => y - x);
  const routes = [...new Set(jobs.map((j) => j.route))].sort();
  const cell = (route: string, width: number) => {
    const r = results.find((x) => x.route === route && x.width === width);
    return r ? `${r.pass ? '✅' : '❌'} ${r.pct.toFixed(2)}%` : '⬜';
  };
  const lines = [
    '# Fidelity status',
    '',
    `Generated ${new Date().toISOString()} — gate: page height ±${MAX_HEIGHT_DELTA}px and every ${BAND}px band ≤ ${MAX_BAND_PCT}% differing pixels. ⬜ = not built/captured yet.`,
    '',
    `| Route | ${widths.join(' | ')} |`,
    `| --- | ${widths.map(() => '---').join(' | ')} |`,
    ...routes.map((r) => `| \`${r}\` | ${widths.map((w) => cell(r, w)).join(' | ')} |`),
    '',
    `**${results.filter((r) => r.pass).length}/${jobs.length}** route×viewport cells pass.`,
    '',
  ];
  await fs.writeFile(path.resolve('fidelity/STATUS.md'), lines.join('\n'));
  console.log('wrote fidelity/STATUS.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
