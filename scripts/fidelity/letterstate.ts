// Inline style/computed transform of the first split-text letters after the shared freeze:  pnpm tsx scripts/fidelity/letterstate.ts <route> <width> [localBase]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, width, localBase = 'http://localhost:3000'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', localBase]) {
    const live = base.includes('techversantinfotech');
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (live) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    console.log((live ? 'LIVE ' : 'LOCAL') + '\n' + (await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.tm-split-text'));
      const h = all.find((e) => /Unleash/.test(e.textContent || '')) ?? all[0];
      if (!h) return 'no split text';
      return h.innerHTML.replace(/\s+/g, ' ').slice(0, 600);
    })));
    await ctx.close();
  }
  await b.close();
})();
