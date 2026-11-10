/**
 * One-time (resumable) local mirror of the WordPress uploads referenced by the content snapshot, so the app
 * and the fidelity runs do not depend on, or hit, production.
 *   content/asset-urls.json  (list of URLs)  ->  public/wp-assets/wp-content/uploads/...
 * Plus the hero video (hosted on S3) -> public/wp-assets/media/. Read-only against the live site.
 *   pnpm assets:mirror
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('public/wp-assets');
const UA = { 'User-Agent': 'Mozilla/5.0 (techversant-next asset mirror)' };
const EXTRA: { url: string; dest: string }[] = [
  { url: 'https://techv-media.s3.us-east-2.amazonaws.com/Techversent+No-Text+Final.mp4', dest: 'media/hero.mp4' },
];

async function download(url: string, dest: string): Promise<'ok' | 'skip' | 'fail'> {
  try {
    await fs.access(dest);
    return 'skip';
  } catch {
    /* not there yet */
  }
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return 'fail';
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

async function main() {
  const urls = JSON.parse(await fs.readFile(path.resolve('content/asset-urls.json'), 'utf8')) as string[];
  const jobs = [
    ...urls.map((u) => ({ url: u, dest: path.join(OUT, decodeURIComponent(new URL(u).pathname)) })),
    ...EXTRA.map((e) => ({ url: e.url, dest: path.join(OUT, e.dest) })),
  ];
  const stats = { ok: 0, skip: 0, fail: 0 };
  const failed: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        const r = await download(j.url, j.dest).catch(() => 'fail' as const);
        stats[r]++;
        if (r === 'fail') failed.push(j.url);
        if ((stats.ok + stats.skip + stats.fail) % 100 === 0) console.log(`${stats.ok + stats.skip + stats.fail}/${jobs.length}`, stats);
      }
    }),
  );
  console.log('done', stats);
  if (failed.length) console.log('failed:\n' + failed.slice(0, 20).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
