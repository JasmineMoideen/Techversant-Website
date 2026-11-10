// Extracts homepage copy/links/images (sections below the logo strip) from the live page into src/content/home.generated.json.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://techversantinfotech.com/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.evaluate(async () => { for (let y = 0; y < 7000; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
const data = await p.evaluate(() => {
  const up = (s) => s.replace(/^https?:\/\/techversantinfotech\.com\/wp-content\/uploads\//, '');
  const path = (h) => (h ? h.replace(/^https?:\/\/techversantinfotech\.com/, '') : h);
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  const out = {};
  out.projects = [...document.querySelectorAll('.homePrjtGrid .projects-current-theme2')].map((c) => ({
    href: path(c.querySelector('.title a').href),
    title: txt(c.querySelector('.title a')),
    excerpt: txt(c.querySelector('.excerpt')),
    img: up(c.querySelector('img').getAttribute('data-src') || c.querySelector('img').src),
    alt: c.querySelector('img').alt,
  }));
  const promo = (box) => ({
    href: path(box.querySelector('a.wpr-promo-box-link')?.href ?? ''),
    img: up((box.querySelector('.wpr-promo-box-bg-image')?.style.backgroundImage ?? '').replace(/^url\(["']?|["']?\)$/g, '')),
    titleHtml: box.querySelector('.wpr-promo-box-title span')?.innerHTML.trim() ?? '',
    title: txt(box.querySelector('.wpr-promo-box-title span')),
    hidden: [...box.closest('.elementor-element')?.classList ?? []].filter((c) => /hidden/.test(c)),
  });
  const boxes = [...document.querySelectorAll('.wpr-promo-box')].filter((b) => !b.closest('header,footer'));
  out.promoBoxes = boxes.map((bx) => { const r = bx.getBoundingClientRect(); return { y: Math.round(r.y + scrollY), x: Math.round(r.x), w: Math.round(r.width), ...promo(bx) }; });
  out.seeMore = [...document.querySelectorAll('a.btn-plain-text-with-arrow')].filter((a) => !a.closest('header,footer')).map((a) => ({ y: Math.round(a.getBoundingClientRect().y + scrollY), href: path(a.href), text: txt(a), html: a.innerHTML.replace(/\s+/g, ' ').slice(0, 400) }));
  out.titles = [...document.querySelectorAll('.tm-sc-section-title')].filter((t) => !t.closest('header,footer')).map((t) => ({
    y: Math.round(t.getBoundingClientRect().y + scrollY),
    cls: t.className,
    sub: txt(t.querySelector('.subtitle')),
    title: txt(t.querySelector('h2,h3')),
    para: txt(t.querySelector('.paragraph')),
  }));
  const hsImg = document.querySelector('.pp-hot-spot-image img').getBoundingClientRect();
  out.hotspots = [...document.querySelectorAll('.pp-hot-spot-wrap')].map((h) => { const r = h.getBoundingClientRect(); const cs = getComputedStyle(h); return { label: h.getAttribute('aria-label') ?? '', tooltip: txt(document.querySelector(h.getAttribute('data-tooltip-content') ?? 'x-none')), left: cs.left, top: cs.top, w: Math.round(r.width), xPct: +(((r.x - hsImg.x) / hsImg.width) * 100).toFixed(3), yPct: +(((r.y - hsImg.y) / hsImg.height) * 100).toFixed(3) }; });
  out.hotspotImg = up((document.querySelector('.pp-hot-spot-image img')?.getAttribute('data-src')) ?? '');
  const join = [...document.querySelectorAll('p')].find((x) => /^Join a passionate/.test(x.textContent.trim()));
  out.join = { para: txt(join) };
  out.testimonials = [...document.querySelectorAll('.wpr-testimonial-item')].map((t) => ({
    name: txt(t.querySelector('.wpr-testimonial-name')),
    job: txt(t.querySelector('.wpr-testimonial-job')),
    title: txt(t.querySelector('.wpr-testimonial-title')),
    text: txt(t.querySelector('.wpr-testimonial-content-inner em')),
    img: up(t.querySelector('img')?.getAttribute('data-src') || t.querySelector('img')?.src || ''),
    cls: t.className.replace(/elementor-repeater-item-\w+/, '').trim(),
  }));
  const eh = [...document.querySelectorAll('h2.elementor-heading-title')].find((x) => /Build your future/.test(x.textContent));
  out.careers = { heading: txt(eh), btn: (() => { const a = [...document.querySelectorAll('a.btn-theme-colored1')].find((x) => /Explore Careers/i.test(x.textContent)); return { href: path(a?.href), text: txt(a) }; })() };
  const col = [...document.querySelectorAll('*')].find((e) => getComputedStyle(e).backgroundImage.includes('coolage'));
  out.collage = col ? up((getComputedStyle(col).backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || '') : '2025/09/coolage.webp';
  return out;
});
fs.writeFileSync('src/content/home.generated.json', JSON.stringify(data, null, 1));
console.log(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : typeof v}`).join(', '));
await b.close();
