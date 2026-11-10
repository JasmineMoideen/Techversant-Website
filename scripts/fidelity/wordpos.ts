// x/width of each word of a text block after the shared freeze, live vs local:  pnpm tsx scripts/fidelity/wordpos.ts <route> <width> "<text start>"
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, width, text] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const res: string[][] = [];
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const live = base.includes('techversantinfotech');
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (live) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    res.push(await p.evaluate((t) => {
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      let node: Text | null = null;
      while ((n = tw.nextNode())) { const el = (n as Text).parentElement!; if ((n.textContent || '').trim().startsWith(t) && !el.closest('header,nav') && el.getClientRects().length) { node = n as Text; break; } }
      if (!node) return ['not found'];
      const s = node.textContent || '';
      const out: string[] = [];
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        const r = document.createRange();
        r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const bb = r.getBoundingClientRect();
        out.push(`${m[0].padEnd(14)} x=${bb.x.toFixed(2)} w=${bb.width.toFixed(2)} y=${(bb.y + scrollY).toFixed(2)}`);
      }
      return out;
    }, text));
    await ctx.close();
  }
  await b.close();
  const n = Math.max(res[0].length, res[1].length);
  for (let i = 0; i < n; i++) console.log(`${(res[0][i] ?? '').padEnd(46)} | ${res[1][i] ?? ''}`);
})();
