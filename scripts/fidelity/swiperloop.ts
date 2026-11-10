// Unfrozen Swiper behaviour (loop / autoplay) live vs local: pnpm tsx scripts/fidelity/swiperloop.ts <route> [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix } from '../lib/freeze';
const [route, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversant')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelector('.pp-logo-carousel')?.scrollIntoView({ block: 'center' }));
    const read = () => p.evaluate(() => {
      const el = document.querySelector<HTMLElement & { swiper?: any }>('.pp-logo-carousel'); // eslint-disable-line @typescript-eslint/no-explicit-any
      const s = el?.swiper; if (!s) return 'none';
      return `loop=${s.params.loop} slides=${s.slides.length} real=${s.realIndex} active=${s.activeIndex} tr=${Math.round(s.translate)} autoplay=${s.autoplay?.running} wrapperX=${getComputedStyle(el!.querySelector('.swiper-wrapper')!).transform}`;
    });
    const out = [await read()];
    for (let i = 0; i < 3; i++) { await p.waitForTimeout(3600); out.push(await read()); }
    console.log((base.includes('localhost') ? 'LOCAL ' : 'LIVE  ') + '\n  ' + out.join('\n  '));
    await ctx.close();
  }
  await b.close();
})();
