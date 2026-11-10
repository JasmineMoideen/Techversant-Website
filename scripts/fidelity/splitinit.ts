// What does the live page look like when the theme's SplitText handler runs?  pnpm tsx scripts/fidelity/splitinit.ts <route> "<selector>"
import { chromium } from '@playwright/test';
import { installBrowserShims } from '../lib/freeze';
const [route, sel] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await installBrowserShims(ctx);
  const p = await ctx.newPage();
  await p.addInitScript((sel) => {
    const probe = (label: string) => {
      const h = document.querySelector(sel) as HTMLElement | null;
      const log = ((window as unknown as { __probes?: string[] }).__probes ??= []);
      if (!h) return void log.push(label + ' no element');
      const words = h.querySelectorAll('div[style*="inline-block"]').length;
      log.push(`${label}: w=${h.offsetWidth} h=${h.offsetHeight} fonts=${document.fonts.status} sheets=${document.styleSheets.length} splitLines=${h.querySelectorAll('.split-line').length} words=${words} parentW=${h.parentElement?.offsetWidth}`);
    };
    document.addEventListener('DOMContentLoaded', () => { probe('dcl'); setTimeout(() => probe('dcl+100'), 100); setTimeout(() => probe('dcl+300'), 300); setTimeout(() => probe('dcl+700'), 700); });
    window.addEventListener('load', () => { probe('load'); setTimeout(() => probe('load+300'), 300); });
  }, sel);
  await p.goto('https://techversantinfotech.com' + route, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  console.log(((await p.evaluate(() => (window as unknown as { __probes?: string[] }).__probes)) ?? []).join('\n'));
  await b.close();
})();
