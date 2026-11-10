// Swiper params (incl. breakpoints) on the live page: pnpm tsx scripts/fidelity/swiperparams.ts <route> [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix } from '../lib/freeze';
const [route, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
  await installBrowserShims(ctx);
  const p = await ctx.newPage();
  await installHeroVideoCorsFix(p);
  await p.goto('https://techversantinfotech.com' + route, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const out = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLElement & { swiper?: any }>('.swiper')).map((el) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = el.swiper; if (!s) return 'no swiper';
    const pick = (o: any) => ({ slidesPerView: o.slidesPerView, spaceBetween: o.spaceBetween, slidesPerGroup: o.slidesPerGroup }); // eslint-disable-line @typescript-eslint/no-explicit-any
    return JSON.stringify({ current: pick(s.params), original: pick(s.originalParams), breakpoints: s.originalParams.breakpoints, breakpointsBase: s.originalParams.breakpointsBase, currentBreakpoint: s.currentBreakpoint, innerWidth: window.innerWidth });
  }));
  console.log(out.join('\n'));
  await b.close();
})();
