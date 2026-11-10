// Like ancestors.ts but starts from the first visible text node that begins with <text> (outside header/nav):
//   pnpm tsx scripts/fidelity/ancestors-text.ts <route> "<text>" [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, text, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    const out = await p.evaluate((t) => {
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      let start: HTMLElement | null = null;
      while ((n = tw.nextNode())) {
        const el = (n as Text).parentElement!;
        if ((n.textContent || '').trim().toLowerCase().startsWith(t.toLowerCase()) && !el.closest('header,nav') && el.getClientRects().length) { start = el; break; }
      }
      const rows: string[] = [];
      for (let el = start; el && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const flags = [
          cs.transform !== 'none' ? `transform:${cs.transform}` : '',
          cs.willChange !== 'auto' ? `will-change:${cs.willChange}` : '',
          cs.opacity !== '1' ? `opacity:${cs.opacity}` : '',
          cs.filter !== 'none' ? `filter:${cs.filter}` : '',
          cs.backdropFilter !== 'none' ? `backdrop:${cs.backdropFilter}` : '',
          cs.position !== 'static' ? `pos:${cs.position}` : '',
          cs.overflow !== 'visible' ? `ovf:${cs.overflow}` : '',
          cs.zIndex !== 'auto' ? `z:${cs.zIndex}` : '',
          cs.mixBlendMode !== 'normal' ? `blend:${cs.mixBlendMode}` : '',
          cs.isolation !== 'auto' ? 'isolate' : '',
        ].filter(Boolean).join(' ');
        rows.push(`${el.tagName.toLowerCase()}.${(el.className?.toString() ?? '').split(/\s+/).slice(0, 3).join('.')} y=${(r.y + scrollY).toFixed(2)} ${flags}`);
      }
      return rows;
    }, text);
    console.log('=== ' + (base.includes('localhost') ? 'LOCAL' : 'LIVE'));
    console.log(out.slice(0, 10).join('\n'));
    await ctx.close();
  }
  await b.close();
})();
