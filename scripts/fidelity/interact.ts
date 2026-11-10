/**
 * Interaction parity, live vs local: runs the same scripted interaction on both sites and compares the resulting
 * screenshot of the affected region.
 *
 *   pnpm tsx scripts/fidelity/interact.ts [--only name1,name2] [--base http://localhost:3000]
 *
 * Writes fidelity/interact/<name>-{live,local}.png (+ -diff.png when they differ). Safety: every non-GET request to
 * either site is aborted at the browser, so nothing a scenario clicks (form submits, AJAX) can reach the live server.
 */
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { installBrowserShims } from '../lib/freeze';

const argv = process.argv.slice(2);
const arg = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const LOCAL = arg('--base') ?? 'http://localhost:3000';
const LIVE = 'https://techversantinfotech.com';
const only = arg('--only')?.split(',');
const OUT = path.join(process.cwd(), 'fidelity/interact');

type Clip = { x: number; y: number; width: number; height: number };
type Ctx = { page: Page; live: boolean; width: number };
type Scenario = {
  name: string;
  width: number;
  route: string;
  /** keep the cookie banner (default: dismissed through localStorage, like a returning visitor) */
  fresh?: boolean;
  /** an optional pre-step run before scrolling the page through (e.g. wait for something) */
  act: (c: Ctx) => Promise<void>;
  /** region to compare; default = the viewport */
  clip?: (c: Ctx) => Promise<Clip | null>;
  /** extra settle time after `act` (ms) */
  settle?: number;
  /** bring the page to its settled layout first (see settleLayout): the live page shifts while lazy images load */
  settled?: boolean;
  /** answer the live site's Contact Form 7 REST call with a validation_failed reply (see shoot) */
  mockCf7?: boolean;
  /** compare a returned string (e.g. the URL path after a click) instead of a screenshot */
  result?: (c: Ctx) => Promise<string>;
};

const vp = (c: Ctx, h = 900): Clip => ({ x: 0, y: 0, width: c.width, height: h });

/** Moves the mouse to the element in several steps, like a person: menus with hover-intent logic ignore a single jump. */
async function humanHover(page: Page, loc: Locator) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox();
  if (!box) throw new Error('nothing to hover');
  await page.mouse.move(300, 300);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
}
async function hoverNav(c: Ctx, label: string) {
  await humanHover(c.page, c.page.locator(`header >> text="${label}" >> visible=true`).first());
}
async function openDrawer(c: Ctx) {
  await c.page.locator(c.live ? '.tm-nav-mobile-button' : 'button.hamburger').first().click();
}
/** Viewport-coordinate clip of an element, scrolled into the middle of the viewport (never taller than the viewport). */
async function clipOf(c: Ctx, loc: Locator, padX = 0, padY = 0): Promise<Clip | null> {
  if (!(await loc.count())) return null;
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await c.page.waitForTimeout(700);
  const box = await loc.boundingBox();
  if (!box) return null;
  const vh = 900;
  const y = Math.max(0, box.y - padY);
  return { x: Math.max(0, box.x - padX), y, width: Math.min(c.width, box.width + padX * 2), height: Math.min(vh - y, box.height + padY * 2) };
}
const elementClip = (c: Ctx, selector: string, pad = 0) => clipOf(c, c.page.locator(selector).first(), pad, pad);
/** Scrolls so the element's top sits at viewport y=`at`, then returns a clip positioned relative to it. */
async function clipAnchored(c: Ctx, loc: Locator, at: number, left: number, up: number, right: number, down: number): Promise<Clip | null> {
  if (!(await loc.count())) return null;
  const box = await loc.boundingBox();
  if (!box) return null;
  await c.page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'instant' }), box.y - at);
  await c.page.waitForTimeout(700);
  return clipAround(c, loc, left, up, right, down);
}
/** A viewport clip positioned relative to an element (same offsets on both sites, whatever their wrappers are). */
async function clipAround(c: Ctx, loc: Locator, left: number, up: number, right: number, down: number): Promise<Clip | null> {
  if (!(await loc.count())) return null;
  const box = await loc.boundingBox();
  if (!box) return null;
  // Whole pixels: fractional clip sizes make equal regions come out 1px apart on the two sites.
  const y = Math.max(0, Math.round(box.y - up));
  const x = Math.max(0, Math.round(box.x - left));
  return { x, y, width: Math.min(c.width - x, Math.round(box.width + left + right)), height: Math.min(900 - y, Math.round(box.y - y + box.height + down)) };
}

const scenarios: Scenario[] = [
  // ---- desktop header menus
  ...['Who we are', 'What we do', 'Technologies', 'Insights', 'Events', 'Career'].map((label): Scenario => ({
    name: `menu-hover-${label.replace(/\W+/g, '')}@1440`, width: 1440, route: '/privacy-policy/',
    act: (c) => hoverNav(c, label), clip: async (c) => vp(c, 620), settle: 1800,
  })),
  { name: 'menu-hover-nested-Industries@1440', width: 1440, route: '/privacy-policy/', settle: 700,
    act: async (c) => { await hoverNav(c, 'What we do'); await c.page.waitForTimeout(500); await humanHover(c.page, c.page.locator('header >> text="Industries" >> visible=true').first()); },
    clip: async (c) => vp(c, 700) },
  { name: 'cta-hover@1440', width: 1440, route: '/privacy-policy/', settle: 500,
    act: async (c) => { await humanHover(c.page, c.page.locator('header >> text="Contact Us" >> visible=true').first()); }, clip: async (c) => vp(c, 140) },
  // ---- header while scrolled (fixed copy above 1024px, pinned header below)
  ...[1440, 1024, 768, 390].map((w): Scenario => ({
    name: `header-scrolled@${w}`, width: w, route: '/privacy-policy/', settle: 1500,
    act: async (c) => { await c.page.mouse.move(c.width / 2, 600); await c.page.mouse.wheel(0, 700); }, clip: async (c) => vp(c, 200),
  })),
  { name: 'menu-hover-scrolled@1440', width: 1440, route: '/privacy-policy/', settle: 1800,
    act: async (c) => { await c.page.mouse.wheel(0, 700); await c.page.waitForTimeout(1200); await hoverNav(c, 'What we do'); }, clip: async (c) => vp(c, 620) },
  // ---- mobile / tablet drawer
  ...[1024, 768, 390].map((w): Scenario => ({ name: `drawer@${w}`, width: w, route: '/privacy-policy/', act: openDrawer, clip: async (c) => vp(c), settle: 900 })),
  ...[768, 390].map((w): Scenario => ({
    name: `drawer-expand@${w}`, width: w, route: '/privacy-policy/', settle: 900,
    act: async (c) => { await openDrawer(c); await c.page.waitForTimeout(700); await c.page.locator(c.live ? '.tm-header-menu .menuzord-menu > li.menu-item-has-children .indicator' : '.m-drawer .m-toggle').first().click(); }, clip: async (c) => vp(c),
  })),
  // ---- cookie consent
  { name: 'cookie-banner@1440', width: 1440, route: '/dpa/', fresh: true, act: async () => {}, clip: async (c) => vp(c), settle: 1500 },
  { name: 'cookie-banner@390', width: 390, route: '/dpa/', fresh: true, act: async () => {}, clip: async (c) => vp(c), settle: 1500 },
  { name: 'cookie-settings@1440', width: 1440, route: '/dpa/', fresh: true, settle: 900,
    act: async (c) => { await c.page.waitForTimeout(1500); await c.page.locator('button:has-text("Settings")').first().click(); }, clip: async (c) => vp(c) },
  { name: 'cookie-settings@390', width: 390, route: '/dpa/', fresh: true, settle: 900,
    act: async (c) => { await c.page.waitForTimeout(1500); await c.page.locator('button:has-text("Settings")').first().click(); }, clip: async (c) => vp(c) },
  // ---- scroll to top button
  { name: 'scrolltop-visible@1440', width: 1440, route: '/capabilities/', settle: 900,
    act: async (c) => { await c.page.mouse.wheel(0, 2600); }, clip: async (c) => ({ x: c.width - 220, y: 900 - 220, width: 220, height: 220 }) },
  // ---- content widgets
  { name: 'accordion-open@1440', width: 1440, route: '/industries/travel-tourism/', settle: 700,
    act: async (c) => { const h = c.page.locator('.card-header .title').nth(1); await h.scrollIntoViewIfNeeded(); await h.click(); },
    clip: async (c) => elementClip(c, '[id^="accordion-holder"], .card-header .title', 10) },
  { name: 'accordion-open@390', width: 390, route: '/industries/travel-tourism/', settle: 700,
    act: async (c) => { const h = c.page.locator('.card-header .title').nth(1); await h.scrollIntoViewIfNeeded(); await h.click(); },
    clip: async (c) => elementClip(c, '[id^="accordion-holder"], .card-header .title', 10) },
  { name: 'home-tile-hover@1440', width: 1440, route: '/', settled: true, settle: 900,
    act: async (c) => { const t = c.page.locator(c.live ? '.wpr-promo-box' : '.industries .promo').nth(c.live ? 1 : 1); await t.scrollIntoViewIfNeeded(); await c.page.waitForTimeout(800); await humanHover(c.page, t); },
    clip: async (c) => clipOf(c, c.page.locator(c.live ? '.wpr-promo-box' : '.industries .promo').nth(1), 10, 10) },
  { name: 'home-seemore-hover@1440', width: 1440, route: '/', settled: true, settle: 600,
    // The link itself is the comparable box (live wraps the label in an inline span, the rebuild in a block span).
    act: async (c) => { const t = c.page.getByText('See More', { exact: true }).first().locator('xpath=ancestor-or-self::a[1]'); await t.scrollIntoViewIfNeeded(); await c.page.waitForTimeout(600); await humanHover(c.page, t); },
    clip: async (c) => clipOf(c, c.page.getByText('See More', { exact: true }).first().locator('xpath=ancestor-or-self::a[1]'), 40, 20) },
  { name: 'home-connect-hover@1440', width: 1440, route: '/', settled: true, settle: 600,
    act: async (c) => { const t = c.page.locator('input[type=submit][value="Connect With Us"]').first(); await t.scrollIntoViewIfNeeded(); await c.page.waitForTimeout(600); await humanHover(c.page, t); },
    clip: async (c) => clipOf(c, c.page.locator('input[type=submit][value="Connect With Us"]').first(), 20, 20) },
  // ---- forms (server round-trips are aborted by the browser; only client-side validation is observed)
  { name: 'form-invalid-contactus@1440', width: 1440, route: '/contact-us/', settle: 1200, mockCf7: true,
    act: async (c) => { const f = c.page.locator('form.wpcf7-form, form.cf').first(); await f.scrollIntoViewIfNeeded(); await f.locator('input[type=submit]').click(); },
    clip: async (c) => elementClip(c, 'form.wpcf7-form, form.cf', 30) },
  { name: 'form-invalid-home@1440', width: 1440, route: '/', settled: true, settle: 1200, mockCf7: true,
    act: async (c) => { const f = c.page.locator('form.wpcf7-form, form.cf').first(); await f.evaluate((e) => e.scrollIntoView({ block: 'center' })); await c.page.waitForTimeout(700); await f.locator('input[type=submit]').click(); },
    clip: async (c) => clipAnchored(c, c.page.locator('form.wpcf7-form input[type=submit], form.cf input[type=submit]').first(), 700, 60, 560, 60, 130) },
  { name: 'form-invalid-home@390', width: 390, route: '/', settled: true, settle: 1200, mockCf7: true,
    act: async (c) => { const f = c.page.locator('form.wpcf7-form, form.cf').first(); await f.evaluate((e) => e.scrollIntoView({ block: 'center' })); await c.page.waitForTimeout(700); await f.locator('input[type=submit]').click(); },
    clip: async (c) => clipAnchored(c, c.page.locator('form.wpcf7-form input[type=submit], form.cf input[type=submit]').first(), 700, 0, 640, 0, 150) },
  { name: 'form-invalid-job@1440', width: 1440, route: '/jobs/senior-associate-talent-acquisition/', settle: 900,
    act: async (c) => { const f = c.page.locator('form.awsm-application-form').first(); await f.scrollIntoViewIfNeeded(); await f.locator('input[type=submit]').click(); },
    clip: async (c) => elementClip(c, 'form.awsm-application-form', 30) },
  // ---- behaviours from the site's custom script
  { name: 'sticky-breadcrumb@1440', width: 1440, route: '/privacy-policy/', settle: 900,
    act: async (c) => { await c.page.mouse.wheel(0, 900); }, clip: async (c) => vp(c, 200) },
  { name: 'home-card-click@1440', width: 1440, route: '/', settle: 2500,
    act: async (c) => { const card = c.page.locator(c.live ? '.homePrjtGrid .isotope-item' : '.proj-grid .proj-card').first(); await card.scrollIntoViewIfNeeded(); await card.click({ position: { x: 60, y: 60 } }); },
    result: async (c) => new URL(c.page.url()).pathname },
  { name: 'awsm-dropdown-open@1440', width: 1440, route: '/talent-acquisition/', settle: 600,
    act: async (c) => { const t = c.page.locator('.awsm-selectric').first(); await t.scrollIntoViewIfNeeded(); await t.click(); },
    clip: async (c) => { const f = c.page.locator('.awsm-filter-wrap').first(); const b = await f.boundingBox(); if (!b) return null; return { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 10), width: b.width + 20, height: Math.min(420, 900 - Math.max(0, b.y - 10)) }; } },
];

/**
 * The live page lays itself out in several passes (lazy images, carousels, grids), so right after load its sections
 * sit at other — fractional — positions than in the settled state, and text then rounds to other pixel rows than in
 * the rebuild. This is what scripts/lib/freeze.ts `prepare()` does about that, minus the CSS freeze (hover and click
 * states need their transitions): scroll through, park carousels, load every lazy image, one resize, back to the top.
 */
async function settleLayout(page: Page) {
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(300, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { window.scrollTo(0, y); await sleep(140); }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(500);
    window.scrollTo(0, 0);
    await sleep(300);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.querySelectorAll<HTMLElement & { swiper?: any }>('.swiper, .swiper-container, .swiper-container-inner, .swiper-initialized').forEach((el) => {
      try { el.swiper?.autoplay?.stop(); if (typeof el.swiper?.slideToLoop === 'function') el.swiper.slideToLoop(0, 0); else el.swiper?.slideTo(0, 0); } catch { /* ignore */ }
    });
    await sleep(400);
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const pending = await page.evaluate(async () => {
      const lazy = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-src]')).filter((img) => img.src !== img.getAttribute('data-src') || img.naturalWidth <= 1);
      await Promise.all(lazy.map((img) => new Promise<void>((res) => {
        const ss = img.getAttribute('data-srcset');
        if (ss) img.srcset = ss;
        img.src = img.getAttribute('data-src') as string;
        if (img.complete && img.naturalWidth > 1) return res();
        img.addEventListener('load', () => res(), { once: true });
        img.addEventListener('error', () => res(), { once: true });
        setTimeout(res, 8000);
      })));
      return lazy.length;
    });
    if (pending === 0) break;
    await page.waitForTimeout(300);
  }
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((img) => img.complete || new Promise<void>((res) => {
      img.addEventListener('load', () => res(), { once: true });
      img.addEventListener('error', () => res(), { once: true });
      setTimeout(res, 8000);
    })));
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function shoot(browser: Browser, base: string, live: boolean, s: Scenario): Promise<Buffer | string | null> {
  const ctx: BrowserContext = await browser.newContext({ viewport: { width: s.width, height: 900 }, deviceScaleFactor: 1 });
  // Nothing may leave the browser towards the live site except GETs (see the file header); the local app's own API is fine.
  await ctx.route('**/*', (route) => (!live || ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort()));
  if (live && s.mockCf7) {
    // The live page's own CF7 script renders whatever the REST endpoint answers; answering locally (inside the browser)
    // shows its real validation UI without a request ever reaching the server.
    await ctx.route('**/contact-form-7/v1/contact-forms/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contact_form_id: 110751, status: 'validation_failed', message: 'One or more fields have an error. Please check and try again.', posted_data_hash: '',
          invalid_fields: [
            { field: 'your-name', message: 'Please fill out this field.', idref: null, error_id: '-ve-your-name' },
            { field: 'tel', message: 'Please fill out this field.', idref: null, error_id: '-ve-tel' },
            { field: 'your-email', message: 'Please fill out this field.', idref: null, error_id: '-ve-your-email' },
            { field: 'your-message', message: 'Please fill out this field.', idref: null, error_id: '-ve-your-message' },
            { field: 'terms', message: 'You must accept the terms and conditions before sending your message.', idref: null, error_id: '-ve-terms' },
          ],
        }),
      }),
    );
  }
  if (!s.fresh) await ctx.addInitScript(() => { try { localStorage.setItem('cookieConsent', 'accepted'); } catch { /* ignore */ } });
  await installBrowserShims(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(base + s.route, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(2200);
    if (s.settled) await settleLayout(page);
    const c: Ctx = { page, live, width: s.width };
    await s.act(c);
    await page.waitForTimeout(s.settle ?? 600);
    if (s.result) return await s.result(c);
    const clip = s.clip ? await s.clip(c) : null;
    const buf = clip ? await page.screenshot({ clip }) : await page.screenshot();
    return buf;
  } catch (e) {
    console.log(`  ${live ? 'live ' : 'local'} ${s.name}: ${(e as Error).message.split('\n')[0]}`);
    return null;
  } finally {
    await ctx.close();
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  let ok = 0;
  let bad = 0;
  for (const s of scenarios) {
    if (only && !only.includes(s.name)) continue;
    const [a, b] = [await shoot(browser, LIVE, true, s), await shoot(browser, LOCAL, false, s)];
    if (!a || !b) { console.log(`?? ${s.name}: ${!a ? 'live' : 'local'} produced no result`); bad++; continue; }
    if (typeof a === 'string' || typeof b === 'string') {
      const same = a === b;
      if (same) ok++; else bad++;
      console.log(`${same ? 'OK ' : 'XX '} ${s.name.padEnd(36)} live=${String(a)} local=${String(b)}`);
      continue;
    }
    fs.writeFileSync(path.join(OUT, `${s.name}-live.png`), a);
    fs.writeFileSync(path.join(OUT, `${s.name}-local.png`), b);
    const A = PNG.sync.read(a), B = PNG.sync.read(b);
    if (A.width !== B.width || A.height !== B.height) { console.log(`XX ${s.name}: size differs live ${A.width}x${A.height} local ${B.width}x${B.height}`); bad++; continue; }
    const D = new PNG({ width: A.width, height: A.height });
    const n = pixelmatch(A.data, B.data, D.data, A.width, A.height, { threshold: 0.1 });
    const pct = (n / (A.width * A.height)) * 100;
    if (pct > 0) fs.writeFileSync(path.join(OUT, `${s.name}-diff.png`), PNG.sync.write(D));
    const pass = pct <= 0.5;
    if (pass) ok++; else bad++;
    console.log(`${pass ? 'OK ' : 'XX '} ${s.name.padEnd(36)} ${pct.toFixed(2)}% differing`);
  }
  await browser.close();
  console.log(`\n${ok} ok, ${bad} differ`);
})();
