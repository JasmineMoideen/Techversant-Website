// DOM + computed style of the first visible carousel slide on the home page after the freeze, live vs local:
//   pnpm tsx scripts/fidelity/slidedump.ts <width> [localBase]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [width, localBase = 'http://localhost:3000'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', localBase]) {
    const live = base.includes('techversantinfotech');
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (live) await installHeroVideoCorsFix(p);
    await p.goto(base + '/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    const out = await p.evaluate((w) => {
      // find the leaf-most element whose text starts with "Streamlining Healthcare" and that is inside the viewport width
      const cands = Array.from(document.querySelectorAll('*')).filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.left >= -1 && r.left < w && /Streamlining.{0,3}Healthcare/i.test(e.textContent || '');
      });
      const el = cands.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      if (!el) return 'not found (' + document.querySelectorAll('.swiper-slide').length + ' slides)';
      const rows: string[] = [];
      for (let e: Element | null = el, d = 0; e && d < 7; e = e.parentElement, d++) {
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        rows.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 3).join('.')} x=${r.x.toFixed(1)} y=${(r.y + scrollY).toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)} fs=${cs.fontSize} fw=${cs.fontWeight} lh=${cs.lineHeight} mt=${cs.marginTop} tf=${cs.transform}`);
      }
      return rows.join('\n  ');
    }, Number(width));
    console.log((live ? 'LIVE ' : 'LOCAL') + '\n  ' + out);
    await ctx.close();
  }
  await b.close();
})();
