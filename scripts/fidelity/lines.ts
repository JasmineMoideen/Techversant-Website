// Split-line texts of a heading after the shared freeze (before normalisation it is the SplitText structure):
//   pnpm tsx scripts/fidelity/lines.ts <route> "<selector>" [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, FREEZE_CSS } from '../lib/freeze';
const [route, sel, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const base of ['https://techversantinfotech.com', 'http://localhost:3000']) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    await p.addStyleTag({ content: FREEZE_CSS });
    await p.waitForTimeout(3500);
    const out = await p.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return 'NOT FOUND';
      const lines = Array.from(el.querySelectorAll('.split-line')).map((l) => `[${Math.round(l.getBoundingClientRect().height)}] ${(l.textContent ?? '').trim()}`);
      const r = el.getBoundingClientRect();
      return `h2 ${Math.round(r.width)}x${Math.round(r.height)} lines=${lines.length}\n  ` + lines.join('\n  ') + `\n  html: ${el.innerHTML.slice(0, 160).replace(/\s+/g, ' ')}`;
    }, sel);
    console.log('=== ' + (base.includes('local') ? 'LOCAL' : 'LIVE'));
    console.log(out);
    await ctx.close();
  }
  await b.close();
})();
