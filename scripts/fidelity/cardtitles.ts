// Computed style of the visible project-card titles on the home page after the shared freeze, live vs local:
//   pnpm tsx scripts/fidelity/cardtitles.ts <width> [localBase]
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
    const rows = await p.evaluate((w) => {
      return Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,a,span')).filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > 0 && r.left < w && /^(Streamlining|Real Estate Surveyor|Transforming)/i.test((e.textContent || '').trim()) && (e.textContent || '').length < 120 && !e.closest('header');
      }).map((e) => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 2).join('.')} x=${r.x.toFixed(1)} y=${(r.y + scrollY).toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)} fs=${cs.fontSize} lh=${cs.lineHeight} mt=${cs.marginTop} :: ${(e.textContent || '').trim().slice(0, 40)}`; });
    }, Number(width));
    console.log((live ? 'LIVE ' : 'LOCAL') + '\n  ' + rows.join('\n  '));
    await ctx.close();
  }
  await b.close();
})();
