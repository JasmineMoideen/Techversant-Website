// Survey of live .tm-split-text headings (split-line count vs visual lines):  pnpm tsx scripts/fidelity/splitsurvey.ts <route> [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, FREEZE_CSS } from '../lib/freeze';
const [route, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
  await installBrowserShims(ctx);
  const p = await ctx.newPage();
  await p.goto('https://techversantinfotech.com' + route, { waitUntil: 'load' });
  await p.addStyleTag({ content: FREEZE_CSS });
  await p.waitForTimeout(3000);
  const rows = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.tm-split-text')).map((h) => {
    const lh = parseFloat(getComputedStyle(h).lineHeight) || 1;
    const lines = h.querySelectorAll('.split-line');
    return `lines=${lines.length} visual=${Math.round(h.getBoundingClientRect().height / lh)} text="${(h.textContent ?? '').trim().slice(0, 70)}"`;
  }));
  console.log(rows.join('\n'));
  await b.close();
})();
