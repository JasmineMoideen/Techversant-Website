/**
 * Accessibility (axe-core) and load-performance smoke test of the local app, plus the same axe run on the live site
 * for comparison:   pnpm tsx scripts/fidelity/a11y-perf.ts [--routes /a/,/b/] [--base http://localhost:3001] [--live]
 *
 * Reports, per page: axe violations by rule (impact) and the layout/paint metrics a visitor feels — LCP, CLS and
 * the transferred JS. A relative comparison with the live site is the point; absolute lab numbers vary by machine.
 */
import { chromium, type Page } from '@playwright/test';
import { installBrowserShims } from '../lib/freeze';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const BASE = arg('--base') ?? 'http://localhost:3001';
const LIVE = 'https://techversantinfotech.com';
const routes = (arg('--routes') ?? '/,/who-we-are/,/capabilities/,/services/artificial-intelligence/,/industries/healthcare-life-sciences/,/projects/evento/,/jobs/senior-associate-talent-acquisition/,/contact-us/,/news/').split(',');
const withLive = argv.includes('--live');
const axeSource = fs.readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');

type Axe = { violations: { id: string; impact: string | null; nodes: unknown[] }[] };

async function audit(page: Page, url: string) {
  let jsBytes = 0;
  page.on('response', async (r) => {
    try {
      if ((r.headers()['content-type'] ?? '').includes('javascript')) jsBytes += (await r.body()).length;
    } catch { /* ignore */ }
  });
  await page.addInitScript(() => {
    (window as unknown as { __m: { lcp: number; cls: number } }).__m = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as unknown as { __m: { lcp: number } }).__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (window as unknown as { __m: { cls: number } }).__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3500);
  const m = await page.evaluate(() => (window as unknown as { __m: { lcp: number; cls: number } }).__m);
  await page.evaluate(axeSource);
  const axe = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Document, o: object) => Promise<Axe> } }).axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } }))) as Axe;
  return { lcp: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)), jsKB: Math.round(jsBytes / 1024), violations: axe.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`) };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const route of routes) {
    for (const [label, base] of withLive ? [['local', BASE], ['live ', LIVE]] as const : [['local', BASE]] as const) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await installBrowserShims(ctx);
      await ctx.addInitScript(() => { try { localStorage.setItem('cookieConsent', 'accepted'); } catch { /* ignore */ } });
      const page = await ctx.newPage();
      try {
        const r = await audit(page, base + route);
        console.log(`${label} ${route.padEnd(52)} LCP ${String(r.lcp).padStart(5)}ms  CLS ${r.cls}  JS ${String(r.jsKB).padStart(5)}KB  axe: ${r.violations.length ? r.violations.join(', ') : 'none'}`);
      } catch (e) {
        console.log(`${label} ${route}: ${(e as Error).message.split('\n')[0]}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
})();
