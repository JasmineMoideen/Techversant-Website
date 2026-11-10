// Compact viewer for fidelity/specs/<slug>@<width>.json:  node scripts/fidelity/spec-view.mjs _home 1440 1650 2420
import fs from 'node:fs';
const [slug, width, y0, y1] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(`fidelity/specs/${slug}@${width}.json`, 'utf8'));
const skip = new Set(['display', 'fontFamily', 'backgroundPosition', 'objectFit', 'borderTopColor', 'borderBottomColor', 'textAlign']);
for (const e of d.elements) {
  const [x, y, w, h] = e.box;
  if (y + h < Number(y0) || y > Number(y1)) continue;
  const s = Object.entries(e.s)
    .filter(([k, v]) => v && !skip.has(k) && !/^(none|normal|0px|rgba\(0, 0, 0, 0\)|auto|static|visible)$/.test(String(v)))
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
  console.log(`${e.sel.slice(0, 55).padEnd(55)} ${[x, y, w, h].map((n) => Math.round(n * 10) / 10).join(',').padEnd(26)} ${s} ${e.text ? '"' + e.text.slice(0, 40) + '"' : ''}`);
}
