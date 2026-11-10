"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initAccordions } from "./enhance/accordion";
import { initAwsm } from "./enhance/awsm";
import { initAwsmApplication } from "./enhance/awsm-application";
import { initCf7 } from "./enhance/cf7";
import { initIsotope } from "./enhance/isotope";
import { initLazy } from "./enhance/lazy";
import { initSiteScripts } from "./enhance/site-scripts";
import { initSplitText } from "./enhance/splittext";
import { initStretch } from "./enhance/stretch";
import { initSwipers } from "./enhance/swiper";
import { initWprGrids } from "./enhance/wprgrid";

type Settings = Record<string, string | undefined>;

function animationFor(settings: Settings): { name: string; delay: number } | null {
  const w = window.innerWidth;
  const device = w <= 767 ? "_mobile" : w <= 1024 ? "_tablet" : "";
  const name = settings[`_animation${device}`] ?? settings[`animation${device}`] ?? settings._animation ?? settings.animation;
  if (!name || name === "none") return null;
  return { name, delay: Number(settings._animation_delay ?? settings.animation_delay ?? 0) };
}

/** Elementor reveal-on-scroll: `.elementor-invisible` elements are shown (and animated) when they enter the viewport. */
function reveal(el: HTMLElement) {
  let settings: Settings = {};
  try {
    settings = JSON.parse(el.getAttribute("data-settings") ?? "{}");
  } catch {
    /* ignore */
  }
  const anim = animationFor(settings);
  const show = () => {
    el.classList.remove("elementor-invisible");
    if (anim) {
      el.classList.add("animated", anim.name);
      // Elementor's `.animated` keeps `animation-fill-mode: both`, which keeps the element on its own compositor
      // layer (grayscale text). Measured against the live site: its text is LCD-smoothed on phones and grayscale on
      // tablet/desktop, so the layer is only released at phone width (the end state equals the normal style).
      if (window.innerWidth <= 767) el.addEventListener("animationend", () => (el.style.animationFillMode = "none"), { once: true });
    }
  };
  if (anim && anim.delay > 0) window.setTimeout(show, anim.delay);
  else show();
}

/**
 * Progressive enhancement for server-rendered Elementor markup: the DOM arrives complete (identical to the
 * WordPress page); this adds the behaviour WordPress' own jQuery plugins provided.
 */
export default function Enhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          reveal(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll<HTMLElement>(".wp-page .elementor-invisible").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    cleanups.push(initStretch());
    cleanups.push(initIsotope(document));
    cleanups.push(initLazy(document));
    cleanups.push(initWprGrids(document));
    cleanups.push(initAccordions(document));
    cleanups.push(initAwsm(document));
    cleanups.push(initAwsmApplication(document));
    cleanups.push(initCf7());
    cleanups.push(initSiteScripts(document));
    cleanups.push(initSplitText(document));
    const swiperSignal = { cancelled: false };
    void initSwipers(document, swiperSignal).then((dispose) => {
      if (swiperSignal.cancelled) dispose();
      else cleanups.push(dispose);
    });
    cleanups.push(() => {
      swiperSignal.cancelled = true;
    });

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
