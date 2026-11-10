/**
 * Motion survey, live vs local (no freeze): what is animating / playing / auto-advancing on a page after load.
 *   pnpm tsx scripts/fidelity/motion.ts <route> [width=1440] [--base http://localhost:3000]
 * Lists running CSS/Web animations (name, target, duration, iterations), <video> state, and carousel instances
 * (Swiper / slick) with their autoplay state — the things a still screenshot cannot show.
 */
import { chromium } from '@playwright/test';
import { installBrowserShims } from '../lib/freeze';
const argv = process.argv.slice(2);
const route = argv[0] ?? '/';
const width = Number(argv[1] && !argv[1].startsWith('--') ? argv[1] : 1440);
const bi = argv.indexOf('--base');
const LOCAL = bi >= 0 ? argv[bi + 1] : 'http://localhost:3000';

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', LOCAL]) {
    const live = base.includes('techversantinfotech');
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    await installBrowserShims(ctx);
    await ctx.addInitScript(() => { try { localStorage.setItem('cookieConsent', 'accepted'); } catch { /* ignore */ } });
    const p = await ctx.newPage();
    await p.goto(base + route, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(1500);
    // scroll through once so reveal-on-scroll and lazy content start, then come back
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(5000);
    const info = await p.evaluate(() => {
      const sel = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`;
      const anims = new Map<string, number>();
      for (const a of document.getAnimations()) {
        const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
        const timing = a.effect?.getTiming();
        if (a.playState !== 'running' || !t) continue;
        const key = `${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'anim'} on ${sel(t)} dur=${timing?.duration} iter=${timing?.iterations}`;
        anims.set(key, (anims.get(key) ?? 0) + 1);
      }
      const videos = Array.from(document.querySelectorAll('video')).map((v) => `${sel(v)} paused=${v.paused} muted=${v.muted} loop=${v.loop} autoplay=${v.autoplay} t=${v.currentTime.toFixed(1)} src=${(v.currentSrc || v.src || '').slice(-40)}`);
      const swipers = Array.from(document.querySelectorAll<HTMLElement & { swiper?: { autoplay?: { running: boolean }; params: { loop?: boolean; slidesPerView?: unknown }; realIndex: number } }>('.swiper, .swiper-container, .swiper-container-inner')).filter((e) => e.swiper).map((e) => `${sel(e)} autoplay=${e.swiper!.autoplay?.running} loop=${e.swiper!.params.loop} perView=${String(e.swiper!.params.slidesPerView)} index=${e.swiper!.realIndex}`);
      const slick = Array.from(document.querySelectorAll('.slick-slider')).map((e) => `${sel(e)} slides=${e.querySelectorAll('.slick-slide:not(.slick-cloned)').length}`);
      return { anims: [...anims.entries()].map(([k, n]) => `${n}x ${k}`).sort(), videos, swipers, slick };
    });
    console.log(`\n=== ${live ? 'LIVE ' : 'LOCAL'} ${route} @${width}`);
    console.log('running animations:\n  ' + (info.anims.join('\n  ') || '(none)'));
    console.log('videos:\n  ' + (info.videos.join('\n  ') || '(none)'));
    console.log('swipers:\n  ' + (info.swipers.join('\n  ') || '(none)'));
    console.log('slick:\n  ' + (info.slick.join('\n  ') || '(none)'));
    await ctx.close();
  }
  await b.close();
})();
