/**
 * Builds the CSS for WordPress/Elementor-rendered pages from the CSS catalog (pnpm snapshot:css) and the HTML
 * snapshot (pnpm snapshot:html):
 *   public/wp/theme-<sig>.css                  theme + Elementor + plugin CSS bundles (one per distinct stylesheet set a
 *                                              page loads on the live site), scoped to `.wp-page` and purged
 *   content/generated/css-map.json             route -> bundle file
 *   content/generated/post-css/<postId>.css    per-post Elementor CSS (scoped), inlined by the page renderer
 *   content/generated/css-assets.json          fonts/images referenced from CSS (for `pnpm assets:mirror`)
 *
 * Run: pnpm build:wp-css
 */
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { processCss, type Used } from '../lib/css-scope';

const ROOT = process.cwd();
const HTML_DIR = path.join(ROOT, 'content/snapshot/html');
const CSS_DIR = path.join(ROOT, 'content/snapshot/css');
const SKIP_ROUTES = new Set(['/']); // the home page is hand-built

type CatalogEntry = { key: string; handle: string; kind: 'link' | 'style'; url?: string; bytes: number };
type Catalog = { entries: Record<string, CatalogEntry>; pages: Record<string, string[]> };

async function collectUsed(routes: string[], htmlIndex: Record<string, { file: string }>): Promise<Used & { postIds: Map<string, number[]> }> {
  const classes = new Set<string>();
  const bodyClasses = new Set<string>();
  const contentClasses = new Set<string>();
  const ids = new Set<string>();
  const tags = new Set<string>();
  const postIds = new Map<string, number[]>();
  for (const route of routes) {
    const $ = cheerio.load(await fs.readFile(path.join(HTML_DIR, htmlIndex[route].file), 'utf8'));
    for (const c of ($('body').attr('class') ?? '').split(/\s+/)) if (c) bodyClasses.add(c);
    for (const c of ($('html').attr('class') ?? '').split(/\s+/)) if (c) bodyClasses.add(c);
    const main = $('.main-content').first();
    classes.add('main-content');
    const ps = new Set<number>();
    main.find('*').addBack().each((_, el) => {
      if (el.type !== 'tag') return;
      tags.add(el.tagName.toLowerCase());
      const cls = el.attribs?.class;
      if (cls) for (const c of cls.split(/\s+/)) if (c) contentClasses.add(c);
      if (el.attribs?.id) ids.add(el.attribs.id);
      const pid = Number(el.attribs?.['data-elementor-id']);
      if (pid) ps.add(pid);
    });
    postIds.set(route, [...ps]);
  }
  classes.add('main-content');
  contentClasses.add('main-content');
  for (const c of bodyClasses) classes.add(c);
  for (const c of contentClasses) classes.add(c);
  const bodyOnly = new Set([...bodyClasses].filter((c) => !contentClasses.has(c)));
  const ambiguous = new Set([...bodyClasses].filter((c) => contentClasses.has(c)));
  return { classes, ids, tags, bodyOnly, ambiguous, postIds };
}

async function main() {
  const htmlIndex = JSON.parse(await fs.readFile(path.join(HTML_DIR, '_index.json'), 'utf8')) as Record<string, { file: string; status: number }>;
  const routes = Object.keys(htmlIndex).filter((r) => htmlIndex[r].status === 200 && !SKIP_ROUTES.has(r));
  const catalog = JSON.parse(await fs.readFile(path.join(CSS_DIR, 'index.json'), 'utf8')) as Catalog;
  const used = await collectUsed(routes, htmlIndex);
  console.log(`used: ${used.classes.size} classes, ${used.ids.size} ids, ${used.tags.size} tags across ${routes.length} pages`);

  // Post 7 is Elementor's global kit (colors/typography variables + base rules) — shared by every page.
  const isPost = (h: string) => /^elementor-post-\d+$/.test(h) && h !== 'elementor-post-7';

  // --- shared bundles: the live site loads a different set of stylesheets per page (plugins only enqueue CSS
  // for the widgets a page uses, in cascade order), so each distinct ordered set becomes its own bundle.
  const assets = new Set<string>();
  const processed = new Map<string, string>();
  let before = 0;
  let after = 0;
  const processKey = async (key: string): Promise<string> => {
    const cached = processed.get(key);
    if (cached !== undefined) return cached;
    const e = catalog.entries[key];
    const css = await fs.readFile(path.join(CSS_DIR, 'files', `${key}.css`), 'utf8');
    before += css.length;
    let out = '';
    try {
      out = processCss(css, { used, baseUrl: e.url ?? 'https://techversantinfotech.com/', assets, keepRoot: true }).trim();
    } catch (err) {
      console.error(`FAILED ${e.handle}: ${(err as Error).message}`);
    }
    after += out.length;
    const text = out ? `/* ${e.handle} */\n${out}\n` : '';
    processed.set(key, text);
    return text;
  };

  const bundles = new Map<string, string>(); // signature -> file name
  const routeBundle: Record<string, string> = {};
  await fs.mkdir(path.join(ROOT, 'public/wp'), { recursive: true });
  for (const f of await fs.readdir(path.join(ROOT, 'public/wp'))) if (f.startsWith('theme')) await fs.rm(path.join(ROOT, 'public/wp', f));
  for (const route of routes) {
    const keys = (catalog.pages[route] ?? []).filter((k) => {
      const e = catalog.entries[k];
      return e && !isPost(e.handle);
    });
    const sig = [...new Set(keys)].join('|');
    let file = bundles.get(sig);
    if (!file) {
      file = `theme-${crypto.createHash('sha1').update(sig).digest('hex').slice(0, 8)}.css`;
      const parts: string[] = [];
      for (const k of new Set(keys)) parts.push(await processKey(k));
      await fs.writeFile(path.join(ROOT, 'public/wp', file), `/* generated by scripts/build/wp-css.ts — do not edit */\n${parts.join('\n')}`);
      bundles.set(sig, file);
    }
    routeBundle[route] = file;
  }
  console.log(`shared bundles: ${bundles.size} files from ${processed.size} stylesheets, ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (unique)`);

  // --- per-post Elementor CSS
  await fs.mkdir(path.join(ROOT, 'content/generated/post-css'), { recursive: true });
  const written = new Set<number>();
  for (const route of routes) {
    for (const key of catalog.pages[route] ?? []) {
      const e = catalog.entries[key];
      if (!e || !isPost(e.handle)) continue;
      const id = Number(e.handle.replace('elementor-post-', ''));
      if (written.has(id) || !(used.postIds.get(route) ?? []).includes(id)) continue;
      const css = await fs.readFile(path.join(CSS_DIR, 'files', `${key}.css`), 'utf8');
      const out = processCss(css, { used: null, baseUrl: e.url ?? 'https://techversantinfotech.com/', assets });
      await fs.writeFile(path.join(ROOT, `content/generated/post-css/${id}.css`), out);
      written.add(id);
    }
  }
  console.log(`post css: ${written.size} files`);

  await fs.mkdir(path.join(ROOT, 'content/generated'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'content/generated/css-assets.json'), JSON.stringify([...assets].sort(), null, 1));
  await fs.writeFile(path.join(ROOT, 'content/generated/css-map.json'), JSON.stringify(routeBundle, null, 1));
  console.log(`css assets: ${assets.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
