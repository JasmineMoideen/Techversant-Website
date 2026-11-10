import fs from 'node:fs/promises';
import { PNG } from 'pngjs';

/**
 * Playwright's fullPage screenshot is as wide as the page's scrollable overflow. The live site overflows
 * horizontally by a few px, which would make reference and candidate images different widths. Crop every
 * capture to the viewport width. Returns the overflow in px that was cropped away.
 */
export async function cropToWidth(file: string, width: number): Promise<number> {
  const png = PNG.sync.read(await fs.readFile(file));
  if (png.width <= width) return 0;
  const out = new PNG({ width, height: png.height });
  PNG.bitblt(png, out, 0, 0, width, png.height, 0, 0);
  await fs.writeFile(file, PNG.sync.write(out));
  return png.width - width;
}
