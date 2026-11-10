import type { BrowserContext, Page } from '@playwright/test';

/**
 * `tsx` compiles with esbuild's keepNames, which wraps named functions in a `__name()` helper. Functions
 * passed to `page.evaluate` run in the browser where that helper does not exist, so define a no-op there.
 * Call once per browser context, before any navigation.
 */
export async function installBrowserShims(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    (globalThis as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f;
    // A full-page screenshot resizes the viewport (height only), which fires a trusted `resize`; the sites'
    // delayed relayout handlers (Isotope grids, WPR grids) would then race with the capture (some timers
    // finish before the screenshot, some after). Layout only depends on the width, so swallow trusted resize
    // events that did not change it — identically on the live site and locally. prepare() fires its own
    // (untrusted) resize once everything is loaded, which settles all grids deterministically.
    let lastWidth = window.innerWidth;
    window.addEventListener(
      'resize',
      (e) => {
        if (!e.isTrusted) return;
        if (window.innerWidth === lastWidth) e.stopImmediatePropagation();
        else lastWidth = window.innerWidth;
      },
      true,
    );
  });
}

/**
 * CSS injected into every captured page — the live site AND the local Next.js app — so that both are
 * rendered in the same deterministic "end state": CSS animations/transitions jump to their final
 * frame, and the cookie banner (captured separately as its own component) is hidden.
 */
export const FREEZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
/* Transitions jump to their end state — except on Isotope / WPR grid items: those libraries move items with a
   400ms transform transition and only clear the transform (writing the final left/top) when it ends. With the
   transition frozen the transform stays, which changes how the images inside are rasterised. */
*:not(.isotope-item):not(.wpr-grid-item), *:not(.isotope-item):not(.wpr-grid-item)::before, *:not(.isotope-item):not(.wpr-grid-item)::after {
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
#cookie-banner, #cookie-settings, .cookie-box { display: none !important; }
/* The live theme animates split-text headings letter by letter with inline JS styles (opacity/transform).
   Force the finished state so captures never catch them mid-animation or still hidden. */
.tm-split-text div { opacity: 1 !important; transform: none !important; }
`;

/** '/' -> '_home', '/industries/x/' -> 'industries__x' (safe directory name for a route). */
export function routeToSlug(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, '');
  return s === '' ? '_home' : s.replace(/\//g, '__');
}

/**
 * The live hero video is hosted on S3 without CORS headers while the <video> has `crossorigin`, so it
 * never loads in production. For the *reference* captures we add the missing header in flight (no change
 * to production) so the hero is captured in its intended, working state.
 */
const videoCache = new Map<string, Buffer>();

export async function installHeroVideoCorsFix(page: Page): Promise<void> {
  // Downloaded once per process and served from memory (with proper Range support) so repeated captures
  // do not re-download ~11 MB each time.
  await page.route('https://techv-media.s3.us-east-2.amazonaws.com/**/*.mp4', async (route) => {
    const url = route.request().url();
    let body = videoCache.get(url);
    if (!body) {
      const res = await fetch(url);
      body = Buffer.from(await res.arrayBuffer());
      videoCache.set(url, body);
    }
    const base = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'access-control-allow-origin': '*' };
    const range = /bytes=(\d*)-(\d*)/.exec(route.request().headers()['range'] ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      await route.fulfill({
        status: 206,
        headers: { ...base, 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': String(end - start + 1) },
        body: body.subarray(start, end + 1),
      });
    } else {
      await route.fulfill({ status: 200, headers: { ...base, 'content-length': String(body.length) }, body });
    }
  });
}

export type PrepareResult = {
  docHeight: number;
  imagesTotal: number;
  imagesBroken: number;
  swipers: number;
  videos: { ready: number; paused: boolean; w: number; h: number }[];
};

/**
 * Brings a loaded page to a deterministic state: injects the freeze CSS, scrolls through the whole page
 * (triggers lazy images and Elementor-style reveal-on-scroll), waits for images and fonts, parks
 * carousels on their first slide with autoplay stopped, parks videos at t=0, and returns to the top.
 */
export async function prepare(page: Page): Promise<PrepareResult> {
  await page.addStyleTag({ content: FREEZE_CSS });

  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(300, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await sleep(140);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(500);
    window.scrollTo(0, 0);
    await sleep(300);
  });

  // Park carousels on slide 0 with autoplay off BEFORE forcing lazy images: Swiper's loop mode re-creates slide
  // clones, which would otherwise bring back un-loaded placeholders.
  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.querySelectorAll<HTMLElement & { swiper?: any }>('.swiper, .swiper-container, .swiper-container-inner, .swiper-initialized').forEach((el) => {
      const s = el.swiper;
      if (!s) return;
      try {
        s.autoplay?.stop();
        if (typeof s.slideToLoop === 'function') s.slideToLoop(0, 0);
        else s.slideTo(0, 0);
      } catch {
        /* ignore */
      }
    });
    await new Promise((r) => setTimeout(r, 400));
  });

  // LiteSpeed lazy-loading: <img src="data:…1x1 gif" data-src="real"> (notably inside carousels, where the
  // slides are off-screen so they never load). Force the real image in before capturing, and retry until no
  // placeholder is left (Swiper loop clones / lazy observers can bring placeholders back).
  for (let attempt = 0; attempt < 4; attempt++) {
    const pending = await page.evaluate(async () => {
      const lazy = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-src]')).filter(
        (img) => img.src !== img.getAttribute('data-src') || img.naturalWidth <= 1,
      );
      await Promise.all(
        lazy.map(
          (img) =>
            new Promise<void>((res) => {
              const ss = img.getAttribute('data-srcset');
              if (ss) img.srcset = ss;
              img.src = img.getAttribute('data-src') as string;
              if (img.complete && img.naturalWidth > 1) return res();
              img.addEventListener('load', () => res(), { once: true });
              img.addEventListener('error', () => res(), { once: true });
              setTimeout(res, 8000);
            }),
        ),
      );
      return lazy.length;
    });
    if (pending === 0) break;
    await page.waitForTimeout(300);
  }

  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete ||
          new Promise<void>((res) => {
            img.addEventListener('load', () => res(), { once: true });
            img.addEventListener('error', () => res(), { once: true });
            setTimeout(res, 8000);
          }),
      ),
    );
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  });

  // Large `decoding="async"` images can be missing from a tall full-page screenshot (not decoded yet).
  // Force synchronous decoding and pre-decode everything.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((i) => {
      i.decoding = 'sync';
    });
    const withTimeout = (p: Promise<unknown>) => Promise.race([p.catch(() => undefined), new Promise((r) => setTimeout(r, 4000))]);
    await Promise.all(imgs.filter((i) => i.complete && i.naturalWidth > 0).map((i) => withTimeout(i.decode())));
  });

  // Videos: wait (only for visible ones) until the first frame is decoded, park at t=0, then stop anything
  // (e.g. Slider Revolution's loop handler) from resuming playback so the screenshot is deterministic.
  await page.evaluate(async () => {
    const vids = Array.from(document.querySelectorAll('video')).filter((v) => v.getBoundingClientRect().width > 0);
    await Promise.all(
      vids.map(async (v) => {
        if (v.readyState < 2) {
          await new Promise<void>((res) => {
            v.addEventListener('loadeddata', () => res(), { once: true });
            setTimeout(res, 15000);
          });
        }
        v.pause();
        if (v.currentTime !== 0) {
          await new Promise<void>((res) => {
            v.addEventListener('seeked', () => res(), { once: true });
            v.currentTime = 0;
            setTimeout(res, 3000);
          });
        }
      }),
    );
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });

  // Split-text headings: the live theme splits each heading into per-letter boxes only when it scrolls into view
  // (a race), so some headings are captured split and others whole. Normalise BOTH sites to plain text.
  await page.evaluate(() => {
    document.querySelectorAll('.split-line').forEach((el) => {
      el.replaceChildren(document.createTextNode(el.textContent ?? ''));
    });
  });

  // Settle: every image is loaded now, so let the sites' own resize handlers (Isotope / WPR grids, carousels)
  // lay out once more with final sizes, then wait for their delayed passes (≤400ms) to finish.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    let swipers = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.querySelectorAll<HTMLElement & { swiper?: any }>('.swiper, .swiper-container, .swiper-container-inner, .swiper-initialized').forEach((el) => {
      const s = el.swiper;
      if (!s) return;
      swipers++;
      try {
        s.autoplay?.stop();
        if (typeof s.slideToLoop === 'function') s.slideToLoop(0, 0);
        else s.slideTo(0, 0);
      } catch {
        /* ignore */
      }
    });
    const videos = Array.from(document.querySelectorAll('video')).map((v) => {
      const r = v.getBoundingClientRect();
      return { ready: v.readyState, paused: v.paused, w: Math.round(r.width), h: Math.round(r.height) };
    });
    const imgs = Array.from(document.images);
    return {
      docHeight: document.documentElement.scrollHeight,
      imagesTotal: imgs.length,
      imagesBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      swipers,
      videos,
    };
  });

  await page.waitForTimeout(600);
  return result;
}
