// Frozen-state clip screenshot of live or local:  pnpm tsx scripts/fidelity/shot.ts <live|local> <route> <width> <y> <height> <out.png> [localBase]
import { chromium } from '@playwright/test';
import { installBrowserShims, installHeroVideoCorsFix, prepare } from '../lib/freeze';
const [which, route, width, y, height, out, localBase = 'http://localhost:3000'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const live = which === 'live';
  const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
  await installBrowserShims(ctx);
  const p = await ctx.newPage();
  if (live) await installHeroVideoCorsFix(p);
  await p.goto((live ? 'https://techversantinfotech.com' : localBase) + route, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await prepare(p);
  await p.screenshot({ path: out, fullPage: true, clip: { x: 0, y: Number(y), width: Number(width), height: Number(height) } });
  await b.close();
})();
