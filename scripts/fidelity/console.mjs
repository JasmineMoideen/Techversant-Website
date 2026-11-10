// Print console errors/warnings and page errors for a URL:  node scripts/fidelity/console.mjs http://localhost:3000/x/ [width]
import { chromium } from '@playwright/test';
const [url, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: Number(w), height: 900 } });
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[${m.type()}]`, m.text().slice(0, 1200)); });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 800)));
p.on('requestfailed', (r) => console.log('[requestfailed]', r.url().slice(0, 160)));
p.on('response', (r) => { if (r.status() >= 400) console.log('[http ' + r.status() + ']', r.url().slice(0, 160)); });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(2500);
await b.close();
