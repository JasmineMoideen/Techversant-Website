// Compact DOM tree (tag.class + rect) under a selector, live vs local:  node scripts/fidelity/domtree.mjs <route> <width> "<selector>" [depth=4]
import { chromium } from '@playwright/test';
const [route, width, sel, depthArg = '4'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
  const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
  await p.goto(base + route, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const lines = await p.evaluate(([sel, maxDepth]) => {
    const out = [];
    const walk = (el, d) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.push(`${'  '.repeat(d)}${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} [${Math.round(r.y + scrollY)},${Math.round(r.height * 10) / 10}] ${cs.display}${cs.position !== 'static' ? ' ' + cs.position : ''}`);
      if (d < maxDepth) for (const c of el.children) walk(c, d + 1);
    };
    const el = document.querySelector(sel);
    if (el) walk(el, 0);
    return out;
  }, [sel, Number(depthArg)]);
  console.log('=== ' + (base.includes('local') ? 'LOCAL' : 'LIVE'));
  console.log(lines.join('\n'));
  await p.close();
}
await b.close();
