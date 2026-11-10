/**
 * Dumps layout + computed-style "specs" from a rendered page: for every visible element that carries text,
 * a background, media, or is an Elementor container/widget, records its document-space bounding box and
 * a subset of computed styles. Used to build components from measured numbers instead of by eye, and to
 * derive design tokens.
 *
 *   pnpm fidelity:specs --routes /,/industries/ --viewports 1440,390
 *   -> fidelity/specs/<slug>@<width>.json
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { installBrowserShims, installHeroVideoCorsFix, prepare, routeToSlug } from '../lib/freeze';
import { VIEWPORT_HEIGHT } from '../lib/viewports';

const argv = process.argv.slice(2);
const arg = (f: string, d?: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : d;
};
const base = (arg('--base', 'https://techversantinfotech.com') as string).replace(/\/$/, '');
const routes = (arg('--routes', '/') as string).split(',').map((s) => s.trim());
const widths = (arg('--viewports', '1440,390') as string).split(',').map(Number);
const outDir = path.resolve(arg('--out', 'fidelity/specs') as string);

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const route of routes) {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'en-US' });
      await installBrowserShims(ctx);
      const page = await ctx.newPage();
      if (/techversantinfotech\.com/.test(base)) await installHeroVideoCorsFix(page);
      await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 90_000 });
      await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {});
      await prepare(page);

      const data = await page.evaluate(() => {
        const PROPS = [
          'display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'textDecorationLine',
          'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
          'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
          'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderBottomWidth', 'borderBottomColor', 'borderTopLeftRadius', 'boxShadow',
          'opacity', 'zIndex', 'gap', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridTemplateColumns', 'overflow', 'maxWidth', 'objectFit', 'transform',
        ] as const;
        const SKIP = new Set(['none', 'normal', 'auto', '0px', 'static', 'block', '1', 'rgba(0, 0, 0, 0)', 'visible', 'start', 'row', 'nowrap', 'transparent', 'solid', 'baseline', 'stretch', '0px 0px 0px 0px', 'initial']);
        const sel = (e: Element) => {
          const id = e.id ? '#' + e.id : '';
          const cls = (e.getAttribute('class') || '')
            .split(/\s+/)
            .filter((c) => c && !/^elementor-(element|repeater|widget)-[0-9a-f]{6,8}$/.test(c))
            .slice(0, 3)
            .join('.');
          return e.tagName.toLowerCase() + id + (cls ? '.' + cls : '');
        };
        const out: unknown[] = [];
        const els = Array.from(document.body.querySelectorAll('*'));
        for (const e of els) {
          const tag = e.tagName.toLowerCase();
          if (['script', 'style', 'link', 'meta', 'noscript', 'path', 'g', 'defs', 'use', 'source', 'br'].includes(tag)) continue;
          const r = e.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const ownText = Array.from(e.childNodes)
            .filter((n) => n.nodeType === 3)
            .map((n) => (n.textContent || '').trim())
            .join(' ')
            .trim();
          const hasBg = cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
          const isMedia = ['img', 'video', 'svg', 'input', 'textarea', 'select', 'button', 'canvas'].includes(tag);
          const elType = e.getAttribute('data-element_type');
          if (!(ownText || hasBg || isMedia || elType)) continue;
          const s: Record<string, string> = {};
          for (const p of PROPS) {
            const v = (cs as unknown as Record<string, string>)[p];
            if (v && !SKIP.has(v)) s[p] = v.length > 140 ? v.slice(0, 140) + '…' : v;
          }
          const entry: Record<string, unknown> = {
            sel: sel(e),
            box: [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
            s,
          };
          if (ownText) entry.text = ownText.slice(0, 80);
          if (elType) entry.el = elType + ':' + (e.getAttribute('data-widget_type') || e.getAttribute('data-id') || '');
          if (tag === 'img') entry.src = ((e as HTMLImageElement).currentSrc || '').split('?')[0].slice(-90);
          if (tag === 'a') entry.href = (e.getAttribute('href') || '').slice(0, 80);
          out.push(entry);
        }
        return { docHeight: document.documentElement.scrollHeight, count: out.length, elements: out };
      });

      const file = path.join(outDir, `${routeToSlug(route)}@${width}.json`);
      await fs.writeFile(file, JSON.stringify({ route, width, base, capturedAt: new Date().toISOString(), ...data }));
      console.log(`${route.padEnd(52)} @${String(width).padEnd(5)} ${String(data.count).padStart(5)} elements, docHeight ${data.docHeight}, ${(JSON.stringify(data).length / 1024).toFixed(0)} KB`);
      await ctx.close();
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
