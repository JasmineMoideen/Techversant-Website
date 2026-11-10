/**
 * Royal Elementor Addons "Grid" / "Media Grid" (`.wpr-grid`): the plugin sizes the items from the column count
 * and gutters, then positions them with Isotope (`fitRows` or `masonry`, percentPosition). This mirrors its
 * `isotopeLayout()` + `setEqualHeight()` and the timing of its layout passes (immediately, +100ms, window load
 * +100ms, document ready +100ms, resize +200ms).
 */

type Settings = {
  layout?: string;
  columns_desktop?: string | number;
  gutter_hr?: number;
  gutter_vr?: number;
  gutter_hr_tablet?: number;
  gutter_vr_tablet?: number;
  gutter_hr_mobile?: number;
  gutter_vr_mobile?: number;
  animation_duration?: number;
  animation_delay?: number;
};

import { getSize } from "./size";

const isItem = (el: Element): el is HTMLElement => el.classList.contains("wpr-grid-item");

function outer(el: HTMLElement) {
  const z = getSize(el);
  return { w: z.outerWidth, h: z.outerHeight };
}

function layout(widget: HTMLElement, grid: HTMLElement, s: Settings) {
  const items = Array.from(grid.children).filter(isItem).filter((el) => getComputedStyle(el).display !== "none");
  if (items.length === 0) return;

  // Column count + gutters for the current viewport (the site only activates the mobile and tablet breakpoints).
  const classes = widget.className.split(" ");
  let mobileCols = 1;
  let tabletCols = 2;
  for (const c of classes.slice(0, -1)) {
    if (/mobile\d/.test(c)) mobileCols = Number(c.slice(-1));
    if (/tablet\d/.test(c)) tabletCols = Number(c.slice(-1));
  }
  const width = window.innerWidth;
  // The plugin reads tablet/mobile column counts from class names as *strings*, so its later `1 === cols` check
  // (which clears the last item's bottom margin) only ever matches the numeric desktop value.
  let colsFromClass = false;
  let cols = parseInt(String(s.columns_desktop ?? 3), 10);
  let gh = s.gutter_hr ?? 0;
  let gv = s.gutter_vr ?? 0;
  if (width <= 767) {
    cols = mobileCols;
    colsFromClass = true;
    gh = s.gutter_hr_mobile ?? gh;
    gv = s.gutter_vr_mobile ?? gv;
  } else if (width <= 1024) {
    cols = tabletCols;
    colsFromClass = true;
    gh = s.gutter_hr_tablet ?? gh;
    gv = s.gutter_vr_tablet ?? gv;
  }
  cols = Math.min(cols, 8);

  const gridSize = getSize(grid);
  const contentWidth = gridSize.innerWidth;
  const itemWidth = Math.floor((contentWidth + gh - 0.3) / cols - gh);
  for (const el of items) {
    const cs = getComputedStyle(el);
    const extra = cs.boxSizing === "border-box" ? 0 : parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    el.style.width = `${itemWidth - extra}px`;
    el.style.marginBottom = `${gv}px`;
  }
  if (cols === 1 && !colsFromClass) items[items.length - 1].style.marginBottom = "0";

  // Isotope: fitRows (default for "list" too) or masonry, both with the horizontal gutter.
  const mode = s.layout === "masonry" ? "masonry" : "fitRows";
  const gridWidth = gridSize.width;
  const innerWidth = contentWidth;
  const placed: { el: HTMLElement; x: number; y: number }[] = [];
  let height = 0;
  if (mode === "fitRows") {
    let x = 0;
    let y = 0;
    let maxY = 0;
    for (const el of items) {
      const { w, h } = outer(el);
      const itemW = w + gh;
      if (x !== 0 && itemW + x > innerWidth + gh) {
        x = 0;
        y = maxY;
      }
      placed.push({ el, x, y });
      maxY = Math.max(maxY, y + h);
      x += itemW;
    }
    height = maxY;
  } else {
    const columnWidth = outer(items[0]).w + gh;
    const cw = innerWidth + gh;
    const excess = columnWidth - (cw % columnWidth);
    const nCols = Math.max(Math[excess && excess < 1 ? "round" : "floor"](cw / columnWidth), 1);
    const colYs = new Array<number>(nCols).fill(0);
    for (const el of items) {
      const { w, h } = outer(el);
      const rem = w % columnWidth;
      const span = Math.min(Math[rem && rem < 1 ? "round" : "ceil"](w / columnWidth), nCols);
      const groups: number[] = [];
      for (let i = 0; i <= nCols - span; i++) groups.push(Math.max(...colYs.slice(i, i + span)));
      const minY = Math.min(...groups);
      const col = groups.indexOf(minY);
      placed.push({ el, x: columnWidth * col, y: minY });
      for (let i = 0; i < span; i++) colYs[col + i] = minY + h;
    }
    height = Math.max(...colYs);
  }
  for (const { el, x, y } of placed) {
    el.style.position = "absolute";
    el.style.left = `${Math.round((x / gridWidth) * 100 * 1e4) / 1e4}%`;
    el.style.top = `${y}px`;
  }
  grid.style.position = "relative";
  grid.style.height = `${height}px`;
}

function setEqualHeight(grid: HTMLElement, s: Settings) {
  const items = Array.from(grid.children).filter((c) => c.tagName === "ARTICLE") as HTMLElement[];
  if (s.layout !== "fitRows" || items.length === 0) return;
  const cols = Math.floor(getSize(grid).width / getSize(items[0]).width);
  if (cols > 1) {
    const max = Math.max(...items.map((el) => getSize(el).height));
    items.forEach((el) => {
      el.style.height = `${max}px`;
    });
  }
}

export function initWprGrids(root: ParentNode): () => void {
  const widgets = Array.from(root.querySelectorAll<HTMLElement>(".elementor-widget-wpr-grid, .elementor-widget-wpr-media-grid"));
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const cleanups: (() => void)[] = [];

  for (const widget of widgets) {
    const grid = widget.querySelector<HTMLElement>(".wpr-grid[data-settings]");
    if (!grid) continue;
    let s: Settings = {};
    try {
      s = JSON.parse(grid.getAttribute("data-settings") ?? "{}");
    } catch {
      continue;
    }
    const run = () => layout(widget, grid, s);

    const reveal = () => {
      grid.style.opacity = "1";
      const items = Array.from(grid.children).filter(isItem);
      items.forEach((el, i) => {
        const inner = el.querySelector<HTMLElement>(":scope > .wpr-grid-item-inner");
        if (!inner) return;
        inner.style.opacity = "1";
        inner.style.top = "0px";
        inner.style.transform = "scale(1)";
        inner.style.transition = `${s.animation_duration ?? 0.3}s ease-in ${((s.animation_delay ?? 0.1) * (i + 1)).toFixed(1)}s`;
      });
    };

    run();
    later(run, 100);
    // imagesLoaded: reveal the grid, flag it, equalise heights (fitRows).
    const imgs = Array.from(grid.querySelectorAll("img")).filter((img) => !img.complete);
    let pending = imgs.length;
    const loaded = () => {
      reveal();
      later(() => grid.classList.add("grid-images-loaded"), 500);
      setEqualHeight(grid, s);
      run();
    };
    if (pending === 0) later(loaded, 0);
    else
      imgs.forEach((img) => {
        const one = () => {
          if (--pending === 0) loaded();
        };
        img.addEventListener("load", one, { once: true });
        img.addEventListener("error", one, { once: true });
      });
    const afterLoad = () => later(run, 100);
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    later(run, 100);
    const onResize = () => later(run, 200);
    window.addEventListener("resize", onResize);
    // Re-lay out when images arrive (the plugin only does so on resize).
    let imgTimer = 0;
    const onImg = () => {
      window.clearTimeout(imgTimer);
      imgTimer = window.setTimeout(run, 150);
    };
    grid.addEventListener("load", onImg, true);
    cleanups.push(() => {
      window.clearTimeout(imgTimer);
      window.removeEventListener("load", afterLoad);
      window.removeEventListener("resize", onResize);
      grid.removeEventListener("load", onImg, true);
    });
  }
  return () => {
    timers.forEach((id) => window.clearTimeout(id));
    cleanups.forEach((fn) => fn());
  };
}
