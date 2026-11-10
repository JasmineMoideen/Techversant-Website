// Swiper state after the shared freeze, live vs local:  pnpm tsx scripts/fidelity/swiperstate.ts <route> [width] [base]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, width = '1440', localBase = 'http://localhost:3000'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', localBase]) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    const out = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLElement & { swiper?: any }>('.swiper')).map((el) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const s = el.swiper; const r = el.getBoundingClientRect();
      return s ? `${el.className.toString().slice(0, 40)} realIndex=${s.realIndex} activeIndex=${s.activeIndex} perView=${s.params.slidesPerView} translate=${Math.round(s.translate)} slides=${s.slides.length} autoplay=${s.autoplay?.running} rect=${Math.round(r.width)}x${Math.round(r.height)}` : `${el.className.toString().slice(0, 40)} (no swiper instance)`;
    }));
    console.log((base.includes('techversantinfotech') ? 'LIVE ' : 'LOCAL') + '\n  ' + out.join('\n  '));
    await ctx.close();
  }
  await b.close();
})();
