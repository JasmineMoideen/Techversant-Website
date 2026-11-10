/**
 * Collects every WordPress asset URL (uploads, plugin/theme images + fonts) referenced by the snapshot pages'
 * main content and by the generated CSS, and merges them into content/asset-urls.json for `pnpm assets:mirror`.
 *   pnpm snapshot:assets
 */
import * as cheerio from 'cheerio';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const HTML_DIR = path.join(ROOT, 'content/snapshot/html');
// ASCII whitespace only: file names may contain U+202F (narrow no-break space), which JS `\s` would match.
const URL_RE = /https?:\/\/(?:www\.)?techversantinfotech\.com\/wp-content\/[^\x00-\x20"'<>(){}\\,]+/g;
const ASSET_EXT = /\.(?:webp|png|jpe?g|gif|svg|avif|ico|woff2?|ttf|otf|eot|mp4|webm|pdf)$/i;

async function main() {
  const index = JSON.parse(await fs.readFile(path.join(HTML_DIR, '_index.json'), 'utf8')) as Record<string, { file: string; status: number }>;
  const found = new Set<string>();
  const add = (u: string) => {
    const clean = u.replace(/[?#].*$/, '');
    if (ASSET_EXT.test(clean)) found.add(clean.replace('://www.', '://'));
  };
  for (const route of Object.keys(index)) {
    if (index[route].status !== 200) continue;
    const $ = cheerio.load(await fs.readFile(path.join(HTML_DIR, index[route].file), 'utf8'));
    let text = $('.main-content').first().html() ?? '';
    text = text.replace(/\\\//g, '/').replace(/&quot;/g, '"').replace(/&amp;|&#038;/g, '&');
    for (const m of text.matchAll(URL_RE)) add(m[0]);
  }
  const cssAssets = JSON.parse(await fs.readFile(path.join(ROOT, 'content/generated/css-assets.json'), 'utf8').catch(() => '[]')) as string[];
  cssAssets.forEach(add);

  const existing = JSON.parse(await fs.readFile(path.join(ROOT, 'content/asset-urls.json'), 'utf8').catch(() => '[]')) as string[];
  const all = new Set([...existing, ...found]);
  await fs.writeFile(path.join(ROOT, 'content/asset-urls.json'), JSON.stringify([...all].sort(), null, 1));
  const missing = [...all].filter((u) => {
    const f = path.join(ROOT, 'public/wp-assets', decodeURIComponent(new URL(u).pathname));
    return !existsSync(f);
  });
  console.log(`found ${found.size} in snapshot+css, total ${all.size}, ${missing.length} not mirrored yet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
