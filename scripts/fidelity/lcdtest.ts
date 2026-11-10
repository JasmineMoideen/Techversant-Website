// Counts coloured (LCD-antialiased) pixels in a clip of the frozen page, for CSS variants:  pnpm tsx scripts/fidelity/lcdtest.ts <route> <width> <x> <y> <w> <h> <base> [css1 css2 ...]
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [route, width, x, y, w, h, base, ...variants] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const css of ['', ...variants]) {
    const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
    await installBrowserShims(ctx);
    const p = await ctx.newPage();
    if (base.includes('techversantinfotech')) await installHeroVideoCorsFix(p);
    await p.goto(base + route, { waitUntil: 'load' });
    if (css) await p.addStyleTag({ content: css });
    await p.waitForTimeout(1500);
    await prepare(p);
    const buf = await p.screenshot({ fullPage: true, clip: undefined });
    const png = PNG.sync.read(buf);
    let n = 0;
    for (let yy = Number(y); yy < Number(y) + Number(h); yy++) for (let xx = Number(x); xx < Number(x) + Number(w); xx++) {
      const i = (yy * png.width + xx) * 4;
      if (Math.abs(png.data[i] - png.data[i + 2]) > 20) n++;
    }
    console.log(`${n} coloured px  ${css || '(none)'}`);
    await ctx.close();
  }
  await b.close();
})();
