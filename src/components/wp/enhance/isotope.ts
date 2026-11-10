/**
 * Isotope layouts for the theme's `.isotope-layout-inner` grids (features blocks, project grids, …).
 * The live theme runs the Isotope library: `fitRows` by default, `masonry` (columnWidth '.isotope-item-sizer')
 * for grids with the `masonry` class. This reproduces both algorithms and the classes the theme script adds
 * (`isotope-rendered`, `isotope-layout-single-item`); items end up absolutely positioned with left/top.
 */

import { getSize } from "./size";

const isItem = (el: Element): el is HTMLElement => el.classList.contains("isotope-item") && !el.classList.contains("isotope-item-sizer");

function outerSize(el: HTMLElement) {
  const z = getSize(el);
  return { w: z.outerWidth, h: z.outerHeight };
}

function layout(container: HTMLElement, masonry: boolean) {
  const items = Array.from(container.children).filter(isItem).filter((el) => getComputedStyle(el).display !== "none");
  if (items.length === 0) return;

  const innerWidth = getSize(container).innerWidth;

  const placed: { el: HTMLElement; x: number; y: number }[] = [];
  let height = 0;

  if (masonry) {
    // layoutMode "masonry", columnWidth: '.isotope-item-sizer'
    const sizer = container.querySelector<HTMLElement>(":scope > .isotope-item-sizer");
    const columnWidth = outerSize(sizer ?? items[0]).w;
    if (!columnWidth) return;
    const excess = columnWidth - (innerWidth % columnWidth);
    const cols = Math.max(Math[excess && excess < 1 ? "round" : "floor"](innerWidth / columnWidth), 1);
    const colYs = new Array<number>(cols).fill(0);
    for (const el of items) {
      const { w, h } = outerSize(el);
      const remainder = w % columnWidth;
      const span = Math.min(Math[remainder && remainder < 1 ? "round" : "ceil"](w / columnWidth), cols);
      const groups: number[] = [];
      for (let i = 0; i <= cols - span; i++) groups.push(Math.max(...colYs.slice(i, i + span)));
      const minY = Math.min(...groups);
      const col = groups.indexOf(minY);
      placed.push({ el, x: columnWidth * col, y: minY });
      for (let i = 0; i < span; i++) colYs[col + i] = minY + h;
    }
    height = Math.max(...colYs);
  } else {
    // layoutMode "fitRows" (the theme's default)
    let x = 0;
    let y = 0;
    let maxY = 0;
    for (const el of items) {
      const { w, h } = outerSize(el);
      if (x !== 0 && w + x > innerWidth) {
        x = 0;
        y = maxY;
      }
      placed.push({ el, x, y });
      maxY = Math.max(maxY, y + h);
      x += w;
    }
    height = maxY;
  }

  for (const { el, x, y } of placed) {
    el.style.position = "absolute";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
  container.style.position = "relative";
  container.style.height = `${height}px`;
}

/** jQuery imagesLoaded semantics: wait until every <img> in the grid has finished loading (or failed). */
function whenImagesLoaded(el: HTMLElement, cb: () => void) {
  const pending = Array.from(el.querySelectorAll("img")).filter((img) => !img.complete);
  if (pending.length === 0) return cb();
  let left = pending.length;
  const one = () => {
    if (--left === 0) cb();
  };
  pending.forEach((img) => {
    img.addEventListener("load", one, { once: true });
    img.addEventListener("error", one, { once: true });
  });
}

/**
 * Mirrors the theme's `TM_masonryIsotope()`: it runs at DOM ready, again 400ms after window load, again after
 * the resize event it triggers (+400ms) and after every window resize (+400ms). Between those moments nothing
 * re-lays out a grid — lazy images that arrive later do not change the container height.
 */
export function initIsotope(root: ParentNode): () => void {
  const grids = Array.from(root.querySelectorAll<HTMLElement>(".isotope-layout")).filter((g) => g.querySelector(":scope > .isotope-layout-inner"));
  if (grids.length === 0) return () => {};

  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const render = (outer: HTMLElement) => {
    const inner = outer.querySelector<HTMLElement>(":scope > .isotope-layout-inner");
    if (!inner) return;
    outer.classList.add("isotope-rendered");
    const count = Array.from(inner.children).filter(isItem).length;
    if (count === 1) outer.classList.add("isotope-layout-single-item");
    const masonry = outer.classList.contains("masonry");
    whenImagesLoaded(outer, () => layout(inner, masonry));
  };
  const renderAll = () => grids.forEach(render);

  later(renderAll, 0);
  const afterLoad = () => {
    later(renderAll, 400);
    later(renderAll, 800);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
  const onResize = () => later(renderAll, 400);
  window.addEventListener("resize", onResize);
  // The live theme only re-lays out on resize, so grids keep the sizes of their lazy placeholders until then.
  // Re-lay out when images arrive too: same end state as the live page after a resize, without the stale gaps.
  let imgTimer = 0;
  const onImg = () => {
    window.clearTimeout(imgTimer);
    imgTimer = window.setTimeout(renderAll, 150);
  };
  grids.forEach((g) => g.addEventListener("load", onImg, true));

  return () => {
    timers.forEach((id) => window.clearTimeout(id));
    window.clearTimeout(imgTimer);
    window.removeEventListener("load", afterLoad);
    window.removeEventListener("resize", onResize);
    grids.forEach((g) => g.removeEventListener("load", onImg, true));
  };
}
