// Image state after the shared freeze, live vs local:  pnpm tsx scripts/fidelity/imginfo.ts <route> "<selector>" [width]
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
    const out = await p.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLImageElement | null;
      if (!el) return 'NOT FOUND';
      const r = el.getBoundingClientRect();
      return { attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value.slice(0, 70)])), rect: [r.width, r.height], natural: [el.naturalWidth, el.naturalHeight], complete: el.complete, cur: el.currentSrc?.slice(-50) };
    }, sel);
    console.log(base.includes('local') ? 'LOCAL' : 'LIVE ', JSON.stringify(out));
    await ctx.close();
  }
  await b.close();
})();
