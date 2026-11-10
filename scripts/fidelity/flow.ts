// Debug the capture flow stage by stage:  pnpm tsx scripts/fidelity/flow.ts <base> <route> "<selector>" [width]
import { chromium } from '@playwright/test';
import { installBrowserShims, prepare } from '../lib/freeze';
const [base, route, sel, width = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 } });
  await installBrowserShims(ctx);
  const p = await ctx.newPage();
  const probe = async (label: string) => {
    const out = await p.evaluate((sel) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).slice(0, 4);
      return els.map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.top + scrollY)}/${Math.round(r.height)}`; }).join(' ');
    }, sel);
    console.log(label.padEnd(22), out);
  };
  await p.goto(base + route, { waitUntil: 'load' });
  await probe('after load');
  await p.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await probe('after networkidle');
  await prepare(p);
  await probe('after prepare');
  await p.screenshot({ path: '/tmp/flow.png', fullPage: true });
  await probe('after screenshot');
  await b.close();
})();
