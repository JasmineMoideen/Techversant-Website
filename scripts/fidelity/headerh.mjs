// Live header height (and main-content top) per page and viewport:  node scripts/fidelity/headerh.mjs 768 /a/ /b/ ...
import { chromium } from '@playwright/test';
const [w, ...routes] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: Number(w), height: 900 } });
for (const r of routes) {
  const p = await ctx.newPage();
  await p.goto('https://techversantinfotech.com' + r, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const out = await p.evaluate(() => {
    const h = document.querySelector('#header')?.getBoundingClientRect();
    const m = document.querySelector('.main-content')?.getBoundingClientRect();
    const logo = document.querySelector('#tm-header-mobile img, #elementor-header-top-mobile img');
    const lr = logo?.getBoundingClientRect();
    return `header h=${h?.height.toFixed(2)} main top=${m?.top.toFixed(2)} logo=${lr ? lr.width.toFixed(1) + 'x' + lr.height.toFixed(1) + ' @' + lr.top.toFixed(1) : '-'} ${logo?.getAttribute('class') ?? ''}`;
  });
  console.log(r.padEnd(60), out);
  await p.close();
}
await b.close();
