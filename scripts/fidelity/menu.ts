// Header menu interactions, live vs local (viewport screenshots):
//   pnpm tsx scripts/fidelity/menu.ts [localBase=http://localhost:3001]
import { chromium, type Page } from '@playwright/test';
import fs from 'node:fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const local = process.argv[2] ?? 'http://localhost:3001';
const hideCookie = async (p: Page) => {
  await p.addStyleTag({ content: '#cookie-banner,#cookie-settings{display:none!important}' });
};

async function shot(p: Page, name: string) {
  return { name, buf: await p.screenshot() };
}

async function scenario(base: string, width: number, steps: (p: Page) => Promise<{ name: string; buf: Buffer }[]>) {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(base + '/industries/healthcare-life-sciences/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await hideCookie(p);
  const out = await steps(p);
  await b.close();
  return out;
}

const desktop = async (p: Page) => {
  const res: { name: string; buf: Buffer }[] = [];
  for (const label of ['What we do', 'Technologies', 'Insights']) {
    await p.mouse.move(5, 300);
    await p.waitForTimeout(300);
    await p.locator(`header >> text="${label}"`).first().hover();
    await p.waitForTimeout(700);
    res.push(await shot(p, `hover-${label.replace(/\W/g, '')}`));
  }
  return res;
};
const mobile = async (p: Page) => {
  const res: { name: string; buf: Buffer }[] = [];
  await p.locator('#tm-nav-mobile, .tm-nav-mobile-button, button[aria-label*="enu"]').first().click();
  await p.waitForTimeout(900);
  res.push(await shot(p, 'drawer'));
  return res;
};

(async () => {
  for (const [width, steps] of [[1440, desktop], [390, mobile]] as const) {
    const [live, mine] = [await scenario('https://techversantinfotech.com', width, steps).catch((e) => { console.log('live failed', e.message.split('\n')[0]); return []; }), await scenario(local, width, steps).catch((e) => { console.log('local failed', e.message.split('\n')[0]); return []; })];
    for (const l of live) {
      const m = mine.find((x) => x.name === l.name);
      if (!m) { console.log(`${width} ${l.name}: missing locally`); continue; }
      const a = PNG.sync.read(l.buf), c = PNG.sync.read(m.buf);
      const d = new PNG({ width: a.width, height: a.height });
      const n = pixelmatch(a.data, c.data, d.data, a.width, a.height, { threshold: 0.1 });
      fs.writeFileSync(`/tmp/menu-${width}-${l.name}-live.png`, l.buf);
      fs.writeFileSync(`/tmp/menu-${width}-${l.name}-local.png`, m.buf);
      console.log(`${width} ${l.name}: ${((n / (a.width * a.height)) * 100).toFixed(2)}% differing`);
    }
  }
})();
