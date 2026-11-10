// Condensed structural view of a spec: containers w/ grid/flex info, widgets, text, tiles.   node scripts/fidelity/spec-lite.mjs _home 1024 1560 2300
import fs from 'node:fs';
const [slug, width, y0, y1] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(`fidelity/specs/${slug}@${width}.json`, 'utf8'));
for (const e of d.elements) {
  const [x, y, w, h] = e.box.map((n) => Math.round(n * 10) / 10);
  if (y + h < Number(y0) || y > Number(y1) || w === 0) continue;
  const s = e.s;
  const isTile = /wpr-promo-box-style|promo-box-bg-image|homePrjtGrid|e-grid|subtitle|title-part|^p$|^a\.btn|^h[1-6]|wpr-testimonial-item|pp-hot-spot-image|pp-image|wpr-promo-box-link|^a$|^span$|^img/.test(e.sel) || e.text;
  if (!isTile) continue;
  if (/wpr-promo-box-link|bg-overlay/.test(e.sel)) continue;
  const bits = [];
  if (s.gridTemplateColumns) bits.push('cols:' + s.gridTemplateColumns);
  if (s.gap && s.gap !== 'normal') bits.push('gap:' + s.gap);
  if (s.fontSize && (e.text || /subtitle|title|^p|^a/.test(e.sel))) bits.push(`${s.fontSize}/${s.lineHeight}/${s.fontWeight}`);
  if (s.paddingTop && s.paddingTop !== '0px') bits.push(`pad:${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`);
  if (s.marginTop && s.marginTop !== '0px') bits.push(`mt:${s.marginTop}`);
  if (s.backgroundImage) bits.push('bg:' + s.backgroundImage.slice(-40, -2) + ' ' + (s.backgroundSize || ''));
  console.log(`${e.sel.replace(/elementor-element\.?/g, '').slice(0, 38).padEnd(38)} ${[x, y, w, h].join(',').padEnd(24)} ${bits.join(' ')} ${e.text ? '"' + e.text.slice(0, 32) + '"' : ''}`);
}
