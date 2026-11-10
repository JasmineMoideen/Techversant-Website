/**
 * Element measuring the way the layout libraries of the live site do it (Isotope's `get-size`, jQuery's `.width()`):
 * from computed-style strings, not from layout rects. Chrome serialises computed lengths with limited precision, so
 * sums of these values differ from sums of exact layout values by hundredths of a pixel — enough to flip text
 * rounding. Matching the arithmetic matters for pixel parity.
 */
const px = (v: string) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

export type Size = { width: number; height: number; innerWidth: number; innerHeight: number; outerWidth: number; outerHeight: number };

export function getSize(el: HTMLElement): Size {
  const cs = getComputedStyle(el);
  const borderBox = cs.boxSizing === "border-box";
  const pw = px(cs.paddingLeft) + px(cs.paddingRight);
  const ph = px(cs.paddingTop) + px(cs.paddingBottom);
  const bw = px(cs.borderLeftWidth) + px(cs.borderRightWidth);
  const bh = px(cs.borderTopWidth) + px(cs.borderBottomWidth);
  // Chrome returns the border-box size for `width`/`height` of border-box elements.
  const width = px(cs.width) + (borderBox ? 0 : pw + bw);
  const height = px(cs.height) + (borderBox ? 0 : ph + bh);
  return {
    width,
    height,
    innerWidth: width - pw - bw,
    innerHeight: height - ph - bh,
    outerWidth: width + px(cs.marginLeft) + px(cs.marginRight),
    outerHeight: height + px(cs.marginTop) + px(cs.marginBottom),
  };
}
