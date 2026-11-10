/**
 * "Stretched columns" of the theme (`tm-col-stretched-left|right|both` on a top-level container): the first / last
 * child container gets a `.tm-stretched-div` that carries its background and extends to the window edge with a
 * negative margin. Port of the theme's `tm_stretched_col()`, `tm_stretched_col_calc()`, `tm_bgimage_class()` and
 * `tm_bgcolor_class()` (LTR only; the skew variant is not used on this site).
 */

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const childrenOf = (el: Element, sel: string) => Array.from(el.children).filter((c) => c.matches(sel)) as HTMLElement[];
const wrapperOf = (col: HTMLElement) => childrenOf(col, ".e-con-inner")[0] ?? childrenOf(col, ".elementor-widget-wrap")[0];

function stretchColumns() {
  const parents = q(document, ".elementor-element.e-parent");
  for (const p of parents) {
    const yes = ["left", "right", "both"].some((s) => p.classList.contains(`tm-col-stretched-${s}`));
    p.classList.add(yes ? "tm-col-stretched-yes" : "tm-col-stretched-no");
    p.classList.remove(yes ? "tm-col-stretched-no" : "tm-col-stretched-yes");
  }
  for (const p of parents) {
    for (const col of q(p, ".elementor-element.e-child")) {
      q(col, ".tm-stretched-div").forEach((d) => d.remove());
      col.classList.remove("tm-col-stretched-yes", "tm-col-stretched-left", "tm-col-stretched-right", "tm-col-stretched-content-yes");
      wrapperOf(col)?.removeAttribute("style");
    }
  }

  const setup = (section: HTMLElement, col: HTMLElement | undefined, side: "left" | "right") => {
    if (!col || col.querySelector(":scope > .tm-stretched-div")) return;
    const div = document.createElement("div");
    div.className = `tm-stretched-div elementor-element elementor-element-${col.dataset.id ?? ""} tm-stretched-${side}`;
    col.prepend(div);
    col.classList.add("tm-col-stretched-yes", `tm-col-stretched-${side}`);
    col.classList.toggle("tm-col-stretched-content-yes", section.classList.contains(`tm-${side}-col-stretched-content-yes`));
    col.removeAttribute("style");

    const cs = () => getComputedStyle(col);
    const bgImage = cs().backgroundImage;
    if (bgImage && bgImage !== "none") {
      div.style.backgroundImage = bgImage;
      col.style.backgroundImage = "none";
    }
    for (const prop of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"] as const) {
      col.style[prop] = "";
      const r = cs()[prop];
      if (r && r !== "0") {
        div.style[prop] = r;
        col.style[prop] = "0";
      }
    }
    let bg = cs().backgroundColor;
    if (bg) {
      const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(bg);
      if (m) bg = Number(m[4]) === 0 ? "transparent" : `rgb(${m[1]},${m[2]},${m[3]})`;
      div.style.backgroundColor = bg;
      col.style.backgroundColor = "transparent";
    }
    for (const prop of ["backgroundPosition", "backgroundRepeat", "backgroundSize"] as const) {
      const v = cs()[prop];
      if (v) div.style[prop] = v;
    }
  };

  for (const section of q(document, ".elementor-element.e-parent.tm-col-stretched-yes")) {
    if (section.classList.contains("tm-col-stretched-left") || section.classList.contains("tm-col-stretched-both")) {
      setup(section, q(section, ".elementor-element.e-child")[0], "left");
    }
    if (section.classList.contains("tm-col-stretched-right") || section.classList.contains("tm-col-stretched-both")) {
      const inner = childrenOf(section, ".e-con-inner")[0];
      const kids = inner ? childrenOf(inner, ".elementor-element.e-child") : [];
      setup(section, kids[kids.length - 1], "right");
    }
  }
}

function calc() {
  const cols = q(document, ".elementor-element.e-parent > .e-con-inner .elementor-element.e-child.tm-col-stretched-yes");
  if (cols.length === 0) return;
  const windowWidth = document.documentElement.clientWidth;
  for (const col of cols) {
    const parent = col.closest<HTMLElement>(".elementor-element.e-parent");
    if (parent?.classList.contains("tm-col-stretched-both") && (col.classList.contains("elementor-col-100") || col.getAttribute("data-col") === "100")) continue;
    const inner = col.closest<HTMLElement>(".e-con-inner");
    if (!inner) continue;
    const ics = getComputedStyle(inner);
    const currWidth = inner.getBoundingClientRect().width - parseFloat(ics.paddingLeft) - parseFloat(ics.paddingRight);
    const extra = (windowWidth - currWidth) / 2;
    const side = col.classList.contains("tm-col-stretched-right") ? "right" : "left";
    const margin = side === "right" ? "marginRight" : "marginLeft";
    const wrap = wrapperOf(col);
    if (wrap) wrap.style.width = "";
    const sdiv = childrenOf(col, ".tm-stretched-div")[0];
    if (sdiv) sdiv.style[margin] = `-${extra}px`;
    const overlay = sdiv?.nextElementSibling;
    if (overlay instanceof HTMLElement && overlay.classList.contains("elementor-background-overlay")) {
      overlay.style[margin] = `-${extra}px`;
      overlay.style.width = "auto";
      overlay.style.left = "0";
      overlay.style.right = "0";
    }
    if (col.classList.contains("tm-col-stretched-content-yes")) {
      if (sdiv) sdiv.style[margin] = "";
      const sw = (sdiv?.getBoundingClientRect().width ?? 0) + extra;
      if (wrap) {
        wrap.style[margin] = `-${extra}px`;
        wrap.style.width = `${sw}px`;
      }
    } else if (wrap) {
      wrap.style[margin] = "";
      wrap.style.width = "";
    }
  }
}

function bgClasses() {
  const has = (v: string) => v !== "" && v !== "none";
  for (const p of q(document, ".elementor-element.e-parent")) {
    const yes = has(getComputedStyle(p).backgroundImage);
    p.classList.toggle("tm-bgimage-yes", yes);
    p.classList.toggle("tm-bgimage-no", !yes);
  }
  for (const col of q(document, ".elementor-element.e-child")) {
    const target = col.querySelector<HTMLElement>(":scope > .e-con-inner > .tm-stretched-div, :scope > .elementor-widget-wrap > .tm-stretched-div") ?? wrapperOf(col);
    const yes = !!target && has(getComputedStyle(target).backgroundImage);
    col.classList.toggle("tm-bgimage-yes", yes);
    col.classList.toggle("tm-bgimage-no", !yes);
  }
  for (const p of q(document, ".elementor-element.e-parent")) {
    const c = getComputedStyle(p).backgroundColor;
    if (c !== "" && c !== "transparent" && c !== "rgba(0, 0, 0, 0)") p.classList.add("tm-bgcolor-yes");
  }
  for (const col of q(document, ".elementor-element.e-child")) {
    const sd = childrenOf(col, ".tm-stretched-div")[0];
    const target = sd ?? wrapperOf(col);
    const c = target ? getComputedStyle(target).backgroundColor : "";
    const yes = c !== "" && c !== "transparent" && c !== "rgba(0, 0, 0, 0)";
    col.classList.toggle("tm-bgcolor-yes", yes);
    col.classList.toggle("tm-bgcolor-no", !yes);
  }
}

export function initStretch(): () => void {
  const timers: number[] = [];
  stretchColumns();
  calc();
  bgClasses();
  timers.push(window.setTimeout(calc, 100));
  const onResize = () => timers.push(window.setTimeout(calc, 100));
  window.addEventListener("resize", onResize);
  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener("resize", onResize);
  };
}
