// Extracts the mobile-only homepage carousel data (Our Insights slider, 390px viewport) into src/content/home-mobile.generated.json.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('https://techversantinfotech.com/', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(async () => { for (let y = 0; y < 3000; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } });
const data = await p.evaluate(() => {
  const up = (s) => s.replace(/^https?:\/\/techversantinfotech\.com\/wp-content\/uploads\//, '');
  const path = (h) => h.replace(/^https?:\/\/techversantinfotech\.com/, '');
  const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
  const slides = [...document.querySelectorAll('.swiper-slide')].filter((s) => s.querySelector('.projects-current-theme2'));
  const sw = slides[0]?.closest('.swiper, .swiper-container');
  const wrap = sw?.querySelector('.swiper-wrapper');
  const items = slides.map((s) => {
    const r = s.getBoundingClientRect();
    return {
      active: s.classList.contains('swiper-slide-active'),
      dup: s.classList.contains('swiper-slide-duplicate'),
      x: Math.round(r.x), w: Math.round(r.width),
      href: path(s.querySelector('.title a')?.href ?? ''), // the live slider currently renders no title/link
      title: txt(s.querySelector('.title a')),
      excerpt: txt(s.querySelector('.excerpt')),
      img: up(s.querySelector('img').getAttribute('data-src') || s.querySelector('img').src),
      alt: s.querySelector('img').alt,
      w2: s.querySelector('img').getAttribute('width'), h2: s.querySelector('img').getAttribute('height'),
    };
  });
  const arrow = document.querySelector('.tm-swiper-arrow');
  const cs = arrow && getComputedStyle(arrow);
  return { items, swiperClass: sw?.className, wrapperTransform: wrap && getComputedStyle(wrap).transform, arrow: arrow && { html: arrow.outerHTML.slice(0, 600), css: [cs.width, cs.height, cs.borderRadius, cs.boxShadow, cs.backgroundColor, cs.top, cs.left] } };
});
fs.writeFileSync('src/content/home-mobile.generated.json', JSON.stringify(data, null, 1));
console.log(data.items.length, data.swiperClass, data.wrapperTransform, JSON.stringify(data.arrow).slice(0, 700));
console.log(data.items.map((i) => `${i.x}:${i.active ? 'A' : ''}${i.dup ? 'd' : ''} ${i.title.slice(0, 40)} ${i.img}`).join('\n'));
await b.close();
