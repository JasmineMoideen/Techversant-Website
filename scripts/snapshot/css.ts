/**
 * CSS catalog for the content snapshot: reads content/snapshot/html/*.html, finds every stylesheet the live
 * page applies (<link rel=stylesheet> in head AND body — Elementor/LiteSpeed load widget CSS late — plus
 * inline <style> blocks), downloads each unique file once (read-only GETs) and writes
 *   content/snapshot/css/files/<key>.css          raw CSS (key = handle--hash8 / inline--hash8)
 *   content/snapshot/css/index.json               { entries: {key -> {handle, kind, url?, bytes}}, pages: {route -> key[]} }
 *
 * Run: pnpm snapshot:css
 */
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const HTML_DIR = path.resolve('content/snapshot/html');
const OUT = path.resolve('content/snapshot/css');
const FILES = path.join(OUT, 'files');
const UA = { 'User-Agent': 'Mozilla/5.0 (techversant-next snapshot)' };

type Entry = { key: string; handle: string; kind: 'link' | 'style'; url?: string; bytes: number };

const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

async function main() {
  await fs.mkdir(FILES, { recursive: true });
  const index = JSON.parse(await fs.readFile(path.join(HTML_DIR, '_index.json'), 'utf8')) as Record<string, { file: string; status: number }>;
  const routes = Object.keys(index).filter((r) => index[r].status === 200);

  const entries: Record<string, Entry> = {};
  const pending = new Map<string, { url: string; key: string }>();
  const pages: Record<string, string[]> = {};

  for (const route of routes) {
    const html = await fs.readFile(path.join(HTML_DIR, index[route].file), 'utf8');
    const $ = cheerio.load(html);
    const keys: string[] = [];
    $('link[rel="stylesheet"], style').each((_, el) => {
      const $el = $(el);
      if (el.tagName === 'link') {
        const href = $el.attr('href');
        if (!href || /fonts\.googleapis\.com|fonts\.gstatic/.test(href)) return;
        const url = new URL(href.startsWith('//') ? 'https:' + href : href, 'https://techversantinfotech.com/');
        const handle = ($el.attr('id') ?? path.basename(url.pathname, '.css')).replace(/-css$/, '');
        const key = `${handle}--${sha(url.pathname)}`;
        if (!entries[key]) {
          entries[key] = { key, handle, kind: 'link', url: url.href, bytes: 0 };
          pending.set(key, { url: url.href, key });
        }
        keys.push(key);
      } else {
        const css = $el.text();
        if (!css.trim()) return;
        const handle = ($el.attr('id') ?? 'inline').replace(/-css$/, '').replace(/-inline$/, '');
        const key = `${handle}--${sha(css)}`;
        if (!entries[key]) {
          entries[key] = { key, handle, kind: 'style', bytes: css.length };
          void fs.writeFile(path.join(FILES, `${key}.css`), css);
        }
        keys.push(key);
      }
    });
    pages[route] = keys;
  }

  console.log(`${routes.length} pages, ${Object.keys(entries).length} unique stylesheets (${pending.size} to download)`);

  let done = 0;
  const queue = [...pending.values()];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const file = path.join(FILES, `${job.key}.css`);
        let css: string | undefined;
        try {
          css = await fs.readFile(file, 'utf8');
        } catch {
          const res = await fetch(job.url, { headers: UA });
          if (!res.ok) {
            console.error(`FAIL ${res.status} ${job.url}`);
            continue;
          }
          css = await res.text();
          await fs.writeFile(file, css);
          await new Promise((r) => setTimeout(r, 120));
        }
        entries[job.key].bytes = css.length;
        if (++done % 25 === 0) console.log(`${done}/${pending.size}`);
      }
    }),
  );

  await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify({ entries, pages }, null, 1));
  const total = Object.values(entries).reduce((n, e) => n + e.bytes, 0);
  console.log(`done: ${(total / 1024 / 1024).toFixed(1)} MB across ${Object.keys(entries).length} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
