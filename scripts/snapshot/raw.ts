/**
 * Raw content snapshot from the live site's public REST API (read-only, a handful of requests):
 *   content/snapshot/raw/pages.json      all 70 pages  (title, link, parent, modified, rendered Elementor HTML)
 *   content/snapshot/raw/posts.json      the 6 posts
 *   content/snapshot/raw/jobs.json       the 44 job openings (awsm_job_openings)
 *   content/snapshot/raw/job-terms.json  job_category / job_type / job_location terms
 *   content/snapshot/raw/home.html       full homepage HTML (header, footer and menus live outside page content)
 * Parsers (HTML -> typed props) read these files; the app never reads them directly. Run: pnpm snapshot:raw
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SITE_BASE ?? 'https://techversantinfotech.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (techversant-next snapshot)' };
const OUT = path.resolve('content/snapshot/raw');

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

async function save(name: string, data: unknown) {
  const file = path.join(OUT, name);
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  await fs.writeFile(file, body);
  console.log(`${name.padEnd(18)} ${(body.length / 1024).toFixed(0).padStart(6)} KB`);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const fetchedAt = new Date().toISOString();

  const pages = await json<unknown[]>(`${BASE}/wp-json/wp/v2/pages?per_page=100&status=publish&_fields=id,slug,link,parent,modified,title,template,content`);
  await save('pages.json', { fetchedAt, count: pages.length, items: pages });

  const posts = await json<unknown[]>(`${BASE}/wp-json/wp/v2/posts?per_page=100&_fields=id,slug,link,date,modified,title,excerpt,content,featured_media,categories`);
  await save('posts.json', { fetchedAt, count: posts.length, items: posts });

  const jobs = await json<unknown[]>(`${BASE}/wp-json/wp/v2/awsm_job_openings?per_page=100&_fields=id,slug,link,date,modified,title,excerpt,content,job_category,job_type,job_location,meta`);
  await save('jobs.json', { fetchedAt, count: jobs.length, items: jobs });

  // The job objects carry human-readable term names (no separate taxonomy endpoints are exposed), so the
  // filter lists for the jobs UI are derived from the jobs themselves.
  const terms: Record<string, { name: string; count: number }[]> = {};
  for (const tax of ['job_category', 'job_type', 'job_location'] as const) {
    const counts = new Map<string, number>();
    for (const job of jobs as Record<string, unknown>[]) {
      for (const name of (job[tax] as string[] | undefined) ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    terms[tax] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  }
  await save('job-terms.json', { fetchedAt, ...terms });

  const home = await (await fetch(`${BASE}/`, { headers: UA })).text();
  await save('home.html', home);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
