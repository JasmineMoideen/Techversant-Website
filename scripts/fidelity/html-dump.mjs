// Prints simplified live HTML around an element containing the given text:  node scripts/fidelity/html-dump.mjs "Industries We Transform" 4 [width]
import { chromium } from '@playwright/test';
const [anchor, up = '3', width = '1440'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await p.goto('https://techversantinfotech.com/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.evaluate(async () => { for (let y = 0; y < 7000; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
const html = await p.evaluate(([anchor, up]) => {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, el;
  while ((n = tw.nextNode())) if (n.textContent.trim().toLowerCase().startsWith(anchor.toLowerCase()) && !n.parentElement.closest('header,footer,nav')) { el = n.parentElement; break; }
  if (!el) return 'NOT FOUND';
  for (let i = 0; i < Number(up); i++) el = el.parentElement;
  const c = el.cloneNode(true);
  c.querySelectorAll('noscript,script,style').forEach((x) => x.remove());
  c.querySelectorAll('*').forEach((x) => {
    for (const a of [...x.attributes]) {
      if (['srcset', 'sizes', 'data-srcset', 'data-sizes', 'data-id', 'data-element_type', 'data-e-type', 'data-widget_type', 'decoding', 'loading', 'data-lazyloaded', 'data-ll-status', 'title', 'aria-hidden', 'data-settings', 'data-model-cid'].includes(a.name)) x.removeAttribute(a.name);
      else if (a.name === 'src' && a.value.startsWith('data:')) x.removeAttribute('src');
      else if (a.name === 'class') x.setAttribute('class', a.value.replace(/elementor-element-\w+|elementor-repeater-item-\w+|wpr-\w+-no|litespeed-loaded|entered/g, '').replace(/\s+/g, ' ').trim());
      else if (a.value.length > 140) x.setAttribute(a.name, a.value.slice(0, 140) + '…');
    }
    if (x.tagName === 'svg') x.innerHTML = '';
  });
  return c.outerHTML.replace(/https:\/\/techversantinfotech\.com/g, '').replace(/\s+/g, ' ').replace(/> </g, '>\n<');
}, [anchor, up]);
console.log(html);
await b.close();
