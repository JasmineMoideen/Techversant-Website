// Computed properties that create compositing layers along the ancestor chain, live vs local, after the freeze:
//   pnpm tsx scripts/fidelity/ancestors.ts <route> "<selector>" [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, sel, width = '1440'] = process.argv.slice(2);
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
    const out = await p.evaluate((sel) => {
      const rows: string[] = [];
      for (let el = document.querySelector<HTMLElement>(sel); el && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        const flags = [
          cs.transform !== 'none' ? `transform:${cs.transform}` : '',
          cs.willChange !== 'auto' ? `will-change:${cs.willChange}` : '',
          cs.animationName !== 'none' ? `anim:${cs.animationName}` : '',
          cs.opacity !== '1' ? `opacity:${cs.opacity}` : '',
          cs.filter !== 'none' ? `filter:${cs.filter}` : '',
          cs.position !== 'static' ? `pos:${cs.position}` : '',
          cs.overflow !== 'visible' ? `ovf:${cs.overflow}` : '',
          cs.zIndex !== 'auto' ? `z:${cs.zIndex}` : '',
          cs.backfaceVisibility === 'hidden' ? 'backface' : '',
          cs.mixBlendMode !== 'normal' ? `blend:${cs.mixBlendMode}` : '',
        ].filter(Boolean).join(' ');
        if (flags) rows.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className?.toString() ?? '').split(/\s+/).slice(0, 3).join('.')}  ${flags}`);
      }
      return rows;
    }, sel);
    console.log('=== ' + (base.includes('local') ? 'LOCAL' : 'LIVE'));
    console.log(out.join('\n'));
    await ctx.close();
  }
  await b.close();
})();
