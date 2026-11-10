/**
 * Geometry diff by Elementor `data-id` (the same ids exist on the live page and in the local render):
 *   pnpm tsx scripts/fidelity/iddiff.ts <width> <route> [maxRows=25] [tol=0.6]
 * Lists the first elements (document order) whose box differs between live and local, so layout
 * problems can be traced from the first divergence downward.
 */
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';

const [width, route, maxRowsArg, tolArg, deepArg] = process.argv.slice(2);
const deep = deepArg === 'deep';
const maxRows = Number(maxRowsArg ?? 25);
const tol = Number(tolArg ?? 0.6);

type Row = { id: string; kind: string; label: string; box: number[]; vis: string; kids?: string[] };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const sides: Record<string, Row[]> = {};
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const page = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(page);
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await prepare(page);
    sides[base] = await page.evaluate((deep) => {
      const main = document.querySelector('.main-content') ?? document.body;
      return Array.from(main.querySelectorAll<HTMLElement>('[data-id]')).map((el) => {
        const r = el.getBoundingClientRect();
        const kids = deep
          ? Array.from(el.querySelectorAll<HTMLElement>('*'))
              .filter((k) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'BR', 'TEMPLATE'].includes(k.tagName) && !k.hasAttribute('data-id') && !k.closest('[data-id]:not([data-id="' + el.getAttribute('data-id') + '"])'))
              .map((k) => {
                const kr = k.getBoundingClientRect();
                return `${k.tagName.toLowerCase()}${k.className && typeof k.className === 'string' ? '.' + k.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}|${[kr.x, kr.y + scrollY, kr.width, kr.height].map((v) => Math.round(v * 100) / 100).join(',')}`;
              })
          : undefined;
        const cs = getComputedStyle(el);
        const wt = el.getAttribute('data-widget_type');
        return {
          id: el.getAttribute('data-id') as string,
          kind: wt ?? el.getAttribute('data-element_type') ?? el.tagName.toLowerCase(),
          label: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 36),
          box: [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100),
          vis: `${cs.display}/${cs.visibility}/${cs.opacity}`,
          kids,
        };
      });
    }, deep);
    await ctx.close();
  }
  await browser.close();

  const [live, local] = Object.values(sides);
  const byId = new Map(local.map((r) => [r.id, r]));
  let shown = 0;
  let missing = 0;
  console.log(`live ${live.length} elements, local ${local.length}`);
  for (const l of live) {
    const m = byId.get(l.id);
    if (!m) {
      if (missing++ < 5) console.log(`MISSING locally: ${l.id} ${l.kind} "${l.label}"`);
      continue;
    }
    const d = l.box.map((v, i) => Math.round((m.box[i] - v) * 100) / 100);
    let bad = d.some((v) => Math.abs(v) > tol) || l.vis !== m.vis;
    if (deep && l.kids && m.kids) {
      // descendants aligned by index inside the widget; report the first that differs
      for (let i = 0; i < Math.min(l.kids.length, m.kids.length); i++) {
        const [lt, lb] = l.kids[i].split('|');
        const [mt, mb] = m.kids[i].split('|');
        if (lt !== mt) {
          console.log(`  ${l.id} child #${i} tag mismatch: live ${lt} vs local ${mt}`);
          break;
        }
        const lbx = lb.split(',').map(Number);
        const mbx = mb.split(',').map(Number);
        const dd = lbx.map((v, j) => Math.round((mbx[j] - v) * 100) / 100);
        if (dd.some((v) => Math.abs(v) > tol)) {
          console.log(`  ${l.id} child #${i} ${lt}: live ${lb} | d ${dd.join(',')}`);
          bad = true;
          break;
        }
      }
    }
    if (!bad) continue;
    console.log(`${l.id} ${l.kind.slice(0, 30).padEnd(30)} live ${l.box.join(',')} | d ${d.join(',')} ${l.vis !== m.vis ? `| vis ${l.vis} -> ${m.vis}` : ''} "${l.label}"`);
    if (++shown >= maxRows) break;
  }
  if (shown === 0) console.log('no geometry differences');
})();
