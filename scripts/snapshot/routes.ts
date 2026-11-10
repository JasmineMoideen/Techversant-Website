/**
 * Builds content/routes.json — the route manifest for the whole site — from the live Rank Math
 * sitemaps (pages, projects, jobs, categories) plus the REST posts list (posts have no sitemap).
 * Low-concurrency, read-only. Run: pnpm snapshot:routes
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SITE_BASE ?? 'https://techversantinfotech.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (techversant-next fidelity tooling)' };

type Kind = 'page' | 'project' | 'job' | 'post' | 'category' | 'other';
type Route = { path: string; kind: Kind; source: string };

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const isAsset = (u: string) => /\.(jpe?g|png|webp|gif|svg|pdf|mp4)$/i.test(u);

function kindFor(sitemapName: string): Kind {
  if (sitemapName.startsWith('page')) return 'page';
  if (sitemapName.startsWith('projects')) return 'project';
  if (sitemapName.startsWith('awsm_job_openings')) return 'job';
  if (sitemapName.startsWith('category')) return 'category';
  return 'other';
}

async function main() {
  const routes = new Map<string, Route>();

  const index = await getText(`${BASE}/sitemap_index.xml`);
  for (const sm of locs(index)) {
    const name = sm.split('/').pop() ?? sm;
    const urls = locs(await getText(sm)).filter((u) => !isAsset(u));
    for (const u of urls) {
      const p = new URL(u).pathname;
      routes.set(p, { path: p, kind: kindFor(name), source: name });
    }
    console.log(`${name.padEnd(32)} ${urls.length}`);
  }

  // Posts are excluded from the sitemap but exposed through REST.
  const posts = (await (await fetch(`${BASE}/wp-json/wp/v2/posts?per_page=100&_fields=link`, { headers: UA })).json()) as { link: string }[];
  for (const post of posts) {
    const p = new URL(post.link).pathname;
    routes.set(p, { path: p, kind: 'post', source: 'rest:posts' });
  }
  console.log(`${'rest:posts'.padEnd(32)} ${posts.length}`);

  const sorted = [...routes.values()].sort((a, b) => a.path.localeCompare(b.path));
  const out = { generatedAt: new Date().toISOString(), base: BASE, count: sorted.length, routes: sorted };
  const file = path.resolve('content/routes.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(out, null, 2) + '\n');

  const byKind = sorted.reduce<Record<string, number>>((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
  console.log(`\nwrote ${file}: ${sorted.length} routes`, byKind);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
