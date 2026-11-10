/**
 * Accordions of the live site, driven by document-level event delegation:
 *  - PowerPack "advanced accordion" (`.pp-advanced-accordion`): active-default tab opens on init; click/Enter/Space
 *    toggles (accordion type closes the others), arrow keys move focus.
 *  - the theme's Bootstrap-collapse accordions (`.tm-accordion` with `data-bs-toggle="collapse"`), including the
 *    theme's `.card.active` bookkeeping.
 */

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function slideDown(el: HTMLElement, ms: number) {
  el.removeAttribute("hidden");
  el.style.display = "block";
  if (!ms) return;
  const h = el.scrollHeight;
  el.style.overflow = "hidden";
  const anim = el.animate([{ height: "0px" }, { height: `${h}px` }], { duration: ms, easing: "ease" });
  anim.onfinish = () => {
    el.style.overflow = "";
  };
}

function slideUp(el: HTMLElement, ms: number) {
  const done = () => {
    el.style.display = "";
    el.style.overflow = "";
    el.setAttribute("hidden", "");
  };
  if (!ms) return done();
  const h = el.getBoundingClientRect().height;
  el.style.overflow = "hidden";
  const anim = el.animate([{ height: `${h}px` }, { height: "0px" }], { duration: ms, easing: "ease" });
  anim.onfinish = done;
}

/* ---------------------------------------------------------------- PowerPack */

function ppSettings(acc: HTMLElement) {
  let s: { accordion_type?: string; toggle_speed?: number } = {};
  try {
    s = JSON.parse(acc.closest<HTMLElement>("[data-settings]")?.getAttribute("data-settings") ?? "{}");
  } catch {
    /* ignore */
  }
  return { type: s.accordion_type ?? "accordion", speed: reduced() ? 0 : (s.toggle_speed ?? 300) };
}

const ppItems = (acc: HTMLElement) => Array.from(acc.children).filter((c) => c.classList.contains("pp-accordion-item")) as HTMLElement[];
const ppTitle = (item: HTMLElement) => item.querySelector<HTMLElement>(":scope > .pp-accordion-tab-title, :scope > * > .pp-accordion-tab-title");
const ppContent = (item: HTMLElement) => item.querySelector<HTMLElement>(":scope > .pp-accordion-tab-content");

function ppInit(acc: HTMLElement) {
  for (const item of ppItems(acc)) {
    const title = ppTitle(item);
    const content = ppContent(item);
    if (!title || !content) continue;
    if (title.classList.contains("pp-accordion-tab-active-default")) {
      title.classList.add("pp-accordion-tab-show", "pp-accordion-tab-active");
      title.setAttribute("aria-expanded", "true");
      content.removeAttribute("hidden");
      content.style.display = "block";
    } else {
      title.setAttribute("aria-expanded", "false");
      content.setAttribute("hidden", "");
    }
  }
}

function ppToggle(title: HTMLElement) {
  const acc = title.closest<HTMLElement>(".pp-advanced-accordion");
  const item = title.closest<HTMLElement>(".pp-accordion-item");
  if (!acc || !item) return;
  const { type, speed } = ppSettings(acc);
  const content = ppContent(item);
  if (!content) return;
  const open = title.classList.contains("pp-accordion-tab-show");
  const close = (t: HTMLElement, it: HTMLElement) => {
    it.classList.remove("pp-accordion-item-active");
    t.classList.remove("pp-accordion-tab-show", "pp-accordion-tab-active");
    t.setAttribute("aria-expanded", "false");
    const c = ppContent(it);
    if (c && !c.hasAttribute("hidden")) slideUp(c, speed);
  };
  if (type === "accordion") {
    for (const other of ppItems(acc)) {
      const t = ppTitle(other);
      t?.classList.remove("pp-accordion-tab-active-default");
      ppContent(other)?.classList.remove("pp-accordion-tab-active-default");
      if (other !== item && t) close(t, other);
    }
  }
  if (open) close(title, item);
  else {
    title.classList.add("pp-accordion-tab-show", "pp-accordion-tab-active");
    title.setAttribute("aria-expanded", "true");
    item.classList.add("pp-accordion-item-active");
    slideDown(content, speed);
  }
}

/* ---------------------------------------------------------------- Bootstrap */

function bsShow(target: HTMLElement) {
  if (target.classList.contains("show") || target.classList.contains("collapsing")) return;
  const parentSel = target.getAttribute("data-bs-parent");
  if (parentSel) {
    document.querySelectorAll<HTMLElement>(`${parentSel} .collapse.show`).forEach((other) => {
      if (other !== target && other.getAttribute("data-bs-parent") === parentSel) bsHide(other);
    });
  }
  const card = target.parentElement;
  card?.parentElement?.querySelectorAll(":scope > .card").forEach((c) => c.classList.remove("active"));
  card?.classList.add("active");
  target.classList.remove("collapse");
  target.classList.add("collapsing");
  target.style.height = "0px";
  void target.offsetHeight;
  target.style.height = `${target.scrollHeight}px`;
  const done = () => {
    target.classList.remove("collapsing");
    target.classList.add("collapse", "show");
    target.style.height = "";
  };
  target.addEventListener("transitionend", done, { once: true });
  window.setTimeout(done, 500);
}

function bsHide(target: HTMLElement) {
  if (!target.classList.contains("show")) return;
  target.parentElement?.classList.remove("active");
  target.style.height = `${target.getBoundingClientRect().height}px`;
  void target.offsetHeight;
  target.classList.remove("collapse", "show");
  target.classList.add("collapsing");
  target.style.height = "0px";
  const done = () => {
    target.classList.remove("collapsing");
    target.classList.add("collapse");
    target.style.height = "";
  };
  target.addEventListener("transitionend", done, { once: true });
  window.setTimeout(done, 500);
}

function bsToggle(trigger: HTMLElement) {
  const sel = trigger.getAttribute("data-bs-target") ?? trigger.getAttribute("href");
  const target = sel ? document.querySelector<HTMLElement>(sel) : null;
  if (!target) return;
  const willOpen = !target.classList.contains("show");
  if (willOpen) {
    bsShow(target);
    trigger.classList.remove("collapsed");
    trigger.setAttribute("aria-expanded", "true");
    const parentSel = target.getAttribute("data-bs-parent");
    if (parentSel) {
      document.querySelectorAll<HTMLElement>(`${parentSel} [data-bs-toggle="collapse"]`).forEach((t) => {
        if (t !== trigger) {
          t.classList.add("collapsed");
          t.setAttribute("aria-expanded", "false");
        }
      });
    }
  } else {
    bsHide(target);
    trigger.classList.add("collapsed");
    trigger.setAttribute("aria-expanded", "false");
  }
}

export function initAccordions(root: ParentNode): () => void {
  root.querySelectorAll<HTMLElement>(".pp-advanced-accordion").forEach(ppInit);

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    const pp = target?.closest<HTMLElement>(".pp-accordion-tab-title");
    if (pp) {
      e.preventDefault();
      ppToggle(pp);
      return;
    }
    const bs = target?.closest<HTMLElement>('.tm-accordion [data-bs-toggle="collapse"]');
    if (bs) {
      e.preventDefault();
      bsToggle(bs);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    const t = (e.target as Element | null)?.closest<HTMLElement>(".pp-accordion-tab-title");
    if (!t) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ppToggle(t);
      return;
    }
    const titles = Array.from(t.closest(".pp-advanced-accordion")?.querySelectorAll<HTMLElement>(".pp-accordion-tab-title") ?? []);
    const at = titles.indexOf(t);
    const move = e.key === "ArrowDown" ? at + 1 : e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? titles.length - 1 : null;
    if (move !== null && titles.length) {
      e.preventDefault();
      titles[(move + titles.length) % titles.length]?.focus();
    }
  };
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
  };
}
