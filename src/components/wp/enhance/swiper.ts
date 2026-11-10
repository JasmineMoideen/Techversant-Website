/**
 * Carousels (Swiper) of WordPress pages: PowerPack logo carousels (`.pp-swiper-slider`, options in
 * `data-slider-settings`) and the theme's project carousels (`.tm-swiper-container`, options in data attributes).
 * Option mapping mirrors the live scripts (PowerPack's carousel handler + Elementor's breakpoint translation,
 * and the theme's TM_SwiperSlider).
 */
import type { SwiperOptions } from "swiper/types";

type Cfg = Record<string, unknown>;

const yes = (v: unknown) => v === "yes" || v === true;

function ppOptions(el: HTMLElement): SwiperOptions {
  let c: Cfg = {};
  try {
    c = JSON.parse(el.getAttribute("data-slider-settings") ?? "{}");
  } catch {
    /* ignore */
  }
  const count = el.querySelectorAll(".swiper-slide").length;
  const perView = (device: "" | "_tablet" | "_mobile", fallback: number) => Math.min(count, Number(c[`slides_per_view${device}`]) || fallback);
  const space = (device: "" | "_tablet" | "_mobile") => parseFloat(String(c[`space_between${device}`] ?? "")) || 0;
  const desktop = { slidesPerView: perView("", 3), spaceBetween: space("") };
  // PowerPack seeds the base `spaceBetween` from Elementor's current device mode (mobile <= 767, tablet <= 1024,
  // desktop above) while its `1024` breakpoint only carries `slidesPerView` — so at exactly 1024px live shows the
  // desktop item count with the tablet gap.
  const mq = (q: string) => !!window.matchMedia?.(q).matches;
  const mode: "" | "_tablet" | "_mobile" = mq("(max-width: 767px)") ? "_mobile" : mq("(max-width: 1024px)") ? "_tablet" : "";
  const opts: SwiperOptions = {
    grabCursor: yes(c.grab_cursor),
    slidesPerView: desktop.slidesPerView,
    slidesPerGroup: 1,
    spaceBetween: space(mode),
    loop: yes(c.loop),
    centeredSlides: yes(c.centered_slides),
    speed: Number(c.speed) || 300,
    autoHeight: !!c.auto_height,
    effect: (c.effect as "slide") ?? "slide",
    preventClicksPropagation: false,
    slideToClickedSlide: true,
    // Elementor breakpoints: mobile <= 767, tablet <= 1024, desktop above. Swiper breakpoints are min-widths.
    breakpoints: {
      0: { slidesPerView: perView("_mobile", 1), slidesPerGroup: 1, spaceBetween: space("_mobile") },
      767: { slidesPerView: perView("_tablet", 2), slidesPerGroup: 1, spaceBetween: space("_tablet") },
      1024: { slidesPerView: desktop.slidesPerView, slidesPerGroup: 1 },
    },
  };
  if (c.autoplay && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    opts.autoplay = { delay: Number(c.autoplay_speed) || 3000, disableOnInteraction: !!c.pause_on_interaction };
  }
  return opts;
}

function tmOptions(host: HTMLElement): SwiperOptions {
  const a = (name: string, d: number) => Number(host.getAttribute(name) ?? d);
  const bool = (name: string) => host.getAttribute(name) === "true";
  return {
    slidesPerView: a("data-items", 4),
    spaceBetween: a("data-space", 15),
    autoplay: bool("data-autoplay") ? { delay: 3000 } : false,
    loop: bool("data-loop"),
    centeredSlides: bool("data-centered"),
    navigation: { nextEl: host.querySelector<HTMLElement>(".tm-swiper-button-next"), prevEl: host.querySelector<HTMLElement>(".tm-swiper-button-prev") },
    breakpoints: {
      0: { slidesPerView: a("data-xs-items", 1) },
      576: { slidesPerView: a("data-sm-items", 1) },
      768: { slidesPerView: a("data-md-items", 2) },
      992: { slidesPerView: a("data-lg-items", 3) },
      1200: { slidesPerView: a("data-items", 4) },
      1400: { slidesPerView: a("data-xxl-items", 4) },
    },
  };
}

export async function initSwipers(root: ParentNode, signal: { cancelled: boolean }): Promise<() => void> {
  const pp = Array.from(root.querySelectorAll<HTMLElement>(".pp-swiper-slider[data-slider-settings]"));
  const tm = Array.from(root.querySelectorAll<HTMLElement>(".tm-swiper-container"));
  if (pp.length + tm.length === 0) return () => {};

  const [{ default: Swiper }, { Autoplay, Navigation, A11y, Keyboard }] = await Promise.all([import("swiper"), import("swiper/modules")]);
  // The effect may have been cleaned up while the chunk loaded (React Strict Mode runs effects twice in dev).
  if (signal.cancelled) return () => {};
  const instances: InstanceType<typeof Swiper>[] = [];
  const padding: HTMLElement[] = [];
  for (const el of pp) {
    const opts = ppOptions(el);
    // The live site's Swiper 8 clones `slidesPerView` slides to each side whatever the slide count; current Swiper
    // switches loop mode off when there are fewer slides than it needs, which would leave a logo strip that never
    // moves. Repeat the real slides (same period, so the strip looks identical) until loop mode has enough.
    const wrapper = el.querySelector<HTMLElement>(".swiper-wrapper");
    // Slides that scroll in from off-screen are clones of the real ones: give the real logos their sources now so
    // the copies are not left holding lazy-load placeholders.
    el.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
      const srcset = img.getAttribute("data-srcset");
      if (srcset) img.srcset = srcset;
      img.src = img.getAttribute("data-src") as string;
      img.classList.add("entered", "litespeed-loaded");
      img.setAttribute("data-ll-status", "loaded");
    });
    if (opts.loop && wrapper) {
      const real = Array.from(wrapper.children) as HTMLElement[];
      const widest = Math.max(Number(opts.slidesPerView) || 1, ...Object.values(opts.breakpoints ?? {}).map((b) => Number(b.slidesPerView) || 1));
      for (let n = real.length; real.length && n < widest * 2 + 2; ) {
        for (const slide of real) {
          const copy = slide.cloneNode(true) as HTMLElement;
          copy.setAttribute("aria-hidden", "true");
          wrapper.appendChild(copy);
          padding.push(copy);
          n++;
        }
      }
    }
    instances.push(new Swiper(el, { ...opts, modules: [Autoplay, A11y, Keyboard] }));
  }
  for (const host of tm) {
    const inner = host.querySelector<HTMLElement>(".swiper-container-inner");
    if (inner) instances.push(new Swiper(inner, { ...tmOptions(host), modules: [Autoplay, Navigation] }));
  }
  return () => {
    instances.forEach((s) => s.destroy(true, false));
    padding.forEach((n) => n.remove());
  };
}
