/**
 * Crop (and optionally downscale) a region of a PNG so large full-page screenshots can be inspected.
 *   tsx scripts/fidelity/crop.ts <in.png> <out.png> <x> <y> <w> <h> [scale=1]
 * scale < 1 downsamples with a box filter.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [inFile, outFile, xs, ys, ws, hs, ss] = process.argv.slice(2);
if (!inFile || !outFile || !ws) {
  console.error('usage: crop.ts <in.png> <out.png> <x> <y> <w> <h> [scale]');
  process.exit(1);
}
const x = Number(xs), y = Number(ys), scale = Number(ss ?? 1);
const src = PNG.sync.read(fs.readFileSync(inFile));
const w = Math.min(Number(ws), src.width - x);
const h = Math.min(Number(hs), src.height - y);

const ow = Math.max(1, Math.round(w * scale));
const oh = Math.max(1, Math.round(h * scale));
const out = new PNG({ width: ow, height: oh });
for (let oy = 0; oy < oh; oy++) {
  for (let ox = 0; ox < ow; ox++) {
    const sx0 = x + Math.floor(ox / scale), sx1 = Math.min(src.width, x + Math.max(Math.floor(ox / scale) + 1, Math.ceil((ox + 1) / scale)));
    const sy0 = y + Math.floor(oy / scale), sy1 = Math.min(src.height, y + Math.max(Math.floor(oy / scale) + 1, Math.ceil((oy + 1) / scale)));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = sy0; yy < sy1; yy++) {
      for (let xx = sx0; xx < sx1; xx++) {
        const i = (yy * src.width + xx) << 2;
        r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; a += src.data[i + 3]; n++;
      }
    }
    const o = (oy * ow + ox) << 2;
    out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n; out.data[o + 3] = a / n;
  }
}
fs.writeFileSync(outFile, PNG.sync.write(out));
console.log(`source ${src.width}x${src.height} -> ${outFile} (${ow}x${oh})`);
