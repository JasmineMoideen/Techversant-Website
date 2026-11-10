/**
 * Compares fractional document positions of text anchors between the live site and the local app in the frozen
 * state:  pnpm tsx scripts/fidelity/anchors.ts <width> [route] "anchor 1" "anchor 2" ...
 * Prints  anchor | live x,y,w,h | local x,y,w,h | dy   (sub-pixel offsets explain 1px text/edge diffs).
 */
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from './../lib/freeze';

const [width, route, ...anchors] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const res: Record<string, Record<string, number[] | null>> = {};
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    res[base] = await p.evaluate(([anchors, isLive]) => {
      const out: Record<string, number[] | null> = {};
      for (const a of anchors) {
        if (a.startsWith('@')) {
          // @liveSelector|localSelector|index  -> bounding box of that element
          const [ls, ms, idx] = a.slice(1).split('|');
          const el = document.querySelectorAll(isLive ? ls : ms)[Number(idx || 0)];
          const r = el?.getBoundingClientRect();
          out[a] = r ? [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100) : null;
          continue;
        }
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        let found: number[] | null = null;
        while ((n = tw.nextNode())) {
          const el = (n as Text).parentElement!;
          if ((n.textContent || '').trim().toLowerCase().startsWith(a.toLowerCase()) && !el.closest('header,nav') && el.getClientRects().length) {
            const rg = document.createRange();
            rg.selectNodeContents(n);
            const r = rg.getBoundingClientRect();
            found = [r.x, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100);
            break;
          }
        }
        out[a] = found;
      }
      out['__docH'] = [document.documentElement.scrollHeight];
      return out;
    }, [anchors, base.includes('techversantinfotech')] as [string[], boolean]);
    await ctx.close();
  }
  const [live, mine] = Object.values(res);
  for (const a of [...anchors, '__docH']) {
    const l = live[a], m = mine[a];
    console.log(`${a.slice(0, 34).padEnd(34)} live ${String(l).padEnd(36)} local ${String(m).padEnd(36)} dy ${l && m ? Math.round((m[1 < m.length ? 1 : 0] - l[1 < l.length ? 1 : 0]) * 100) / 100 : '-'}`);
  }
  await b.close();
})();
