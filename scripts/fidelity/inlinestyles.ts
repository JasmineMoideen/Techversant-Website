// Inline style attributes of elements after the shared freeze, live vs local:  pnpm tsx scripts/fidelity/inlinestyles.ts <route> "<selector>" [width] [max]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, sel, width = '1440', max = '12'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    const out = await p.evaluate(([sel, max]) => Array.from(document.querySelectorAll<HTMLElement>(sel)).slice(0, Number(max)).map((e) => `${e.getAttribute('style')}  | rect ${(() => { const r = e.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(','); })()}`), [sel, max]);
    console.log('=== ' + (base.includes('local') ? 'LOCAL' : 'LIVE'));
    console.log(out.join('\n'));
    await ctx.close();
  }
  await b.close();
})();
