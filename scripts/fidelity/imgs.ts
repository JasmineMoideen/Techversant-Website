// List images matching a selector after the shared freeze, live vs local:  pnpm tsx scripts/fidelity/imgs.ts <route> "<selector>" [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, sel, width = '1440'] = process.argv.slice(2);
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
    const out = await p.evaluate((sel) => Array.from(document.querySelectorAll<HTMLImageElement>(sel)).map((i) => `${i.complete ? 'C' : '-'} ${i.naturalWidth}x${i.naturalHeight} ${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)} ${(i.currentSrc || i.src).slice(-48)} [${i.getAttribute('loading') ?? ''}${i.hasAttribute('data-ll-status') ? ' ' + i.getAttribute('data-ll-status') : ''}]`), sel);
    console.log('=== ' + (base.includes('local') ? 'LOCAL' : 'LIVE'));
    console.log(out.join('\n'));
    await ctx.close();
  }
  await b.close();
})();
