// Cookie banner + settings panel, live vs local (viewport screenshots):  pnpm tsx scripts/fidelity/cookie.ts [width=1440] [localBase]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
const width = Number(process.argv[2] ?? 1440);
const local = process.argv[3] ?? 'http://localhost:3001';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const shots: Record<string, Record<string, Buffer>> = {};
  for (const [name, base] of [['live', 'https://techversantinfotech.com'], ['local', local]] as const) {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(base + '/dpa/', { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    shots[name] = { banner: await p.screenshot() };
    const settings = p.locator('#cookie-banner .btn-settings, #cookie-banner button:has-text("Settings"), button:has-text("Settings")').first();
    if (await settings.count()) {
      await settings.click();
      await p.waitForTimeout(800);
      shots[name].settings = await p.screenshot();
    }
    await ctx.close();
  }
  await b.close();
  for (const k of Object.keys(shots.live)) {
    if (!shots.local[k]) { console.log(k, 'missing locally'); continue; }
    const a = PNG.sync.read(shots.live[k]);
    const c = PNG.sync.read(shots.local[k]);
    const d = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, c.data, d.data, a.width, a.height, { threshold: 0.1 });
    fs.writeFileSync(`/tmp/cookie-${k}-live.png`, shots.live[k]);
    fs.writeFileSync(`/tmp/cookie-${k}-local.png`, shots.local[k]);
    console.log(`${k} @${width}: ${((n / (a.width * a.height)) * 100).toFixed(2)}% differing`);
  }
})();
