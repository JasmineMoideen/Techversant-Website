/**
 * Full-page HTML snapshot of every route in content/routes.json (read-only GETs against the live site, low
 * concurrency + a small delay: it is production).
 *   content/snapshot/html/<slug>.html     response body
 *   content/snapshot/html/_index.json     route -> { file, status, bytes, finalUrl }
 *
 * Run: pnpm snapshot:html [--force] [--only /path/,/other/] [--concurrency 2]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { routeToSlug } from '../lib/freeze';

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const arg = (f: string, d?: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : d;
};

const BASE = (process.env.SITE_BASE ?? 'https://techversantinfotech.com').replace(/\/$/, '');
const UA = { 'User-Agent': 'Mozilla/5.0 (techversant-next snapshot)' };
const OUT = path.resolve('content/snapshot/html');
const concurrency = Number(arg('--concurrency', '2'));
const delayMs = Number(arg('--delay', '250'));

type Entry = { route: string; file: string; status: number; bytes: number; finalUrl: string };

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const raw = JSON.parse(await fs.readFile(path.resolve('content/routes.json'), 'utf8')) as { routes: { path: string }[] };
  const only = arg('--only')?.split(',').map((s) => s.trim());
  const routes = raw.routes.map((r) => r.path).filter((r) => !only || only.includes(r));

  const indexFile = path.join(OUT, '_index.json');
  const index: Record<string, Entry> = JSON.parse(await fs.readFile(indexFile, 'utf8').catch(() => '{}'));

  const queue = routes.filter((r) => flag('--force') || !index[r]);
  console.log(`${routes.length} routes, ${queue.length} to fetch`);
  let done = 0;

  async function worker() {
    for (;;) {
      const route = queue.shift();
      if (route === undefined) return;
      const url = BASE + route;
      try {
        const res = await fetch(url, { headers: UA, redirect: 'follow' });
        const body = await res.text();
        const file = `${routeToSlug(route)}.html`;
        await fs.writeFile(path.join(OUT, file), body);
        index[route] = { route, file, status: res.status, bytes: body.length, finalUrl: res.url };
        console.log(`${String(++done).padStart(3)}/${done + queue.length} ${res.status} ${(body.length / 1024).toFixed(0).padStart(5)} KB ${route}${res.url !== url ? ' -> ' + res.url : ''}`);
      } catch (e) {
        console.error(`FAIL ${route}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  await fs.writeFile(indexFile, JSON.stringify(index, null, 1));
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
