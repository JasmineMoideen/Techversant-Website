// Rects of several selectors, live vs local:  node scripts/fidelity/rects.mjs <route> <width> "<sel>" "<sel>" ...   (selector may be "sel@idx")
import { chromium } from '@playwright/test';
const [route, width, ...sels] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const res = {};
for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
  const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
  await p.goto(base + route, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  res[base] = await p.evaluate((sels) => sels.map((s) => {
    const [sel, idx] = s.split('@');
    const el = document.querySelectorAll(sel)[Number(idx || 0)];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(',') + `  ${cs.display} mt${cs.marginTop} mb${cs.marginBottom} pt${cs.paddingTop} pb${cs.paddingBottom}`;
  }), sels);
  await p.close();
}
await b.close();
const [live, local] = Object.values(res);
sels.forEach((s, i) => console.log(`${s.padEnd(34)} LIVE ${live[i]}\n${' '.repeat(34)} LOC  ${local[i]}`));
