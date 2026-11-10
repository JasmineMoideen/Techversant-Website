/**
 * Health sweep of the local app over every route (no live site involved):
 *   pnpm tsx scripts/fidelity/sweep.ts [--base http://localhost:3001] [--viewports 1440,390] [--routes /a/,/b/] [--concurrency 3]
 *
 * Per route and viewport it reports what a visitor or a console would show and a pixel diff cannot:
 *   - console errors / warnings and uncaught page errors (React hydration mismatches show up as "Minified React error #418/#423/#425")
 *   - same-origin requests that failed or answered >= 400
 *   - horizontal overflow (page wider than the viewport)
 *   - broken <img> (loaded, naturalWidth 0) after scrolling the whole page once
 *   - document title / exactly one <h1> / a canonical link
 */
import { chromium, type Browser } from '@playwright/test';
import { installBrowserShims } from '../lib/freeze';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const BASE = arg('--base') ?? 'http://localhost:3001';
const VIEWPORTS = (arg('--viewports') ?? '1440,390').split(',').map(Number);
const CONC = Number(arg('--concurrency') ?? 3);
const index = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/snapshot/html/_index.json'), 'utf8')) as Record<string, unknown>;
const routes = (arg('--routes') ?? Object.keys(index).filter((r) => !r.startsWith('_')).join(',')).split(',');

type Result = { route: string; width: number; problems: string[] };

async function check(browser: Browser, route: string, width: number): Promise<Result> {
  const problems: string[] = [];
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await installBrowserShims(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('cookieConsent', 'accepted'); } catch { /* ignore */ } });
  const page = await ctx.newPage();
  const origin = new URL(BASE).origin;
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text().split('\n')[0].slice(0, 160)}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.split('\n')[0].slice(0, 160)}`));
  page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) problems.push(`request failed: ${r.url().replace(origin, '')} (${r.failure()?.errorText})`); });
  page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && !r.url().endsWith('/favicon.ico')) problems.push(`HTTP ${r.status()}: ${r.url().replace(origin, '')}`); });
  try {
    const res = await page.goto(BASE + route, { waitUntil: 'load', timeout: 90000 });
    if (!res || res.status() !== 200) problems.push(`status ${res?.status()}`);
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      broken: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && getComputedStyle(i).display !== 'none').map((i) => i.currentSrc.slice(-70)),
      title: document.title,
      h1: document.querySelectorAll('h1').length,
      canonical: !!document.querySelector('link[rel=canonical]'),
    }));
    if (info.overflow > 1) problems.push(`horizontal overflow ${info.overflow}px`);
    for (const b of info.broken.slice(0, 5)) problems.push(`broken image ${b}`);
    if (!info.title) problems.push('empty <title>');
    if (info.h1 !== 1) problems.push(`${info.h1} <h1> elements`);
    if (!info.canonical) problems.push('no canonical link');
  } catch (e) {
    problems.push(`navigation: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
  return { route, width, problems: Array.from(new Set(problems)) };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const jobs = routes.flatMap((r) => VIEWPORTS.map((w) => ({ r, w })));
  const out: Result[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      out.push(await check(browser, j.r, j.w));
    }
  }));
  await browser.close();
  out.sort((a, b) => a.route.localeCompare(b.route) || b.width - a.width);
  let bad = 0;
  for (const r of out) {
    if (!r.problems.length) continue;
    bad++;
    console.log(`${r.width} ${r.route}`);
    for (const p of r.problems) console.log(`    ${p}`);
  }
  console.log(`\n${out.length - bad} of ${out.length} route/viewport pairs clean, ${bad} with findings`);
})();
