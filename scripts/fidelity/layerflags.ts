// Compositing-related computed styles of an element subtree (selector given for live and local), after the freeze:
//   pnpm tsx scripts/fidelity/layerflags.ts <route> <width> "<live selector>" "<local selector>"
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, width, liveSel, localSel] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const live = base.includes('techversantinfotech');
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (live) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await prepare(p);
    const out = await p.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return ['(not found)'];
      const rows: string[] = [];
      const walk = (el: Element, d: number) => {
        if (d > 5) return;
        const cs = getComputedStyle(el);
        const flags = [
          cs.transform !== 'none' ? `transform:${cs.transform}` : '', cs.willChange !== 'auto' ? `will-change:${cs.willChange}` : '',
          cs.transitionProperty !== 'all' || cs.transitionDuration !== '0s' ? `transition:${cs.transitionProperty}/${cs.transitionDuration}` : '',
          cs.opacity !== '1' ? `opacity:${cs.opacity}` : '', cs.filter !== 'none' ? `filter:${cs.filter}` : '',
          cs.backfaceVisibility === 'hidden' ? 'backface' : '', cs.mixBlendMode !== 'normal' ? `blend:${cs.mixBlendMode}` : '',
          cs.position !== 'static' ? `pos:${cs.position}` : '', cs.zIndex !== 'auto' ? `z:${cs.zIndex}` : '', cs.overflow !== 'visible' ? `ovf:${cs.overflow}` : '',
          cs.isolation !== 'auto' ? 'isolate' : '', cs.contain !== 'none' ? `contain:${cs.contain}` : '', cs.clipPath !== 'none' ? 'clip-path' : '',
        ].filter(Boolean).join(' ');
        rows.push(`${'  '.repeat(d)}${el.tagName.toLowerCase()}.${(el.className?.toString() ?? '').split(/\s+/).slice(0, 2).join('.')}  ${flags}`);
        for (const c of Array.from(el.children)) walk(c, d + 1);
      };
      walk(root, 0);
      return rows;
    }, live ? liveSel : localSel);
    console.log('=== ' + (live ? 'LIVE' : 'LOCAL'));
    console.log(out.join('\n'));
    await ctx.close();
  }
  await b.close();
})();
