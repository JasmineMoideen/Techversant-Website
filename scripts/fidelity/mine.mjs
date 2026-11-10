// Print document-space boxes of local elements:  node scripts/fidelity/mine.mjs 1440 ".stc-sub" ".proj-grid" ...
import { chromium } from '@playwright/test';
const [w, ...sels] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: Number(w), height: 900 } });
await p.goto('http://localhost:3000/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
console.log((await p.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].slice(0, 12).map((e, i) => { const r = e.getBoundingClientRect(); return `${s}[${i}] ${[r.x, r.y + scrollY, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(',')}`; })), sels)).join('\n'));
await b.close();
