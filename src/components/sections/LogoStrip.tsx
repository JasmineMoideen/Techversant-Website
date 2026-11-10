"use client";

import { useEffect, useRef } from "react";
import { upload } from "@/lib/assets";
import { initSwipers } from "@/components/wp/enhance/swiper";

const logos = [
  { src: "2025/01/BIS_logo_LowRes_250x51-1.webp", alt: "BIS Safety Software", w: 250, h: 51 },
  { src: "2025/09/Luma-Logo-Navy-RGB-2048x519-1.webp", alt: "Luma", w: 2048, h: 519 },
  { src: "2026/04/Wagepoint-logo-dark.webp", alt: "Wagepoint", w: 2021, h: 342 },
  { src: "2025/01/tutorsvalley_logo-1.webp", alt: "TutorsValley", w: 250, h: 61 },
  { src: "2025/01/2fb2f52979e7750bb522e2f73709ad50-1.webp", alt: "Titan", w: 259, h: 62 },
];

/** The live widget's own options (PowerPack logo carousel, `data-slider-settings`): 4 / 3 / 2 logos, loops, advances every 3s. */
const SETTINGS = {
  effect: "slide",
  speed: 400,
  slides_per_view: 4,
  space_between: 100,
  auto_height: false,
  loop: "yes",
  autoplay: "yes",
  autoplay_speed: 3000,
  pause_on_interaction: "",
  a11y: "yes",
  slides_per_view_mobile: 2,
  space_between_mobile: 25,
  slides_per_view_tablet: 3,
  space_between_tablet: 10,
};

/**
 * Client-logo carousel (PowerPack logo carousel on the live site). The markup renders in its resting state (slide
 * widths and gaps are exactly what Swiper computes, so nothing moves when it takes over after hydration).
 */
export default function LogoStrip() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const signal = { cancelled: false };
    let dispose: (() => void) | undefined;
    void initSwipers(root.current as HTMLElement, signal).then((d) => {
      if (signal.cancelled) d();
      else dispose = d;
    });
    return () => {
      signal.cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section className="logos" aria-label="Our clients" ref={root}>
      <div className="logos-track swiper pp-swiper-slider" data-slider-settings={JSON.stringify(SETTINGS)}>
        <div className="logos-wrapper swiper-wrapper">
          {logos.map((l) => (
            <div className="logos-slide swiper-slide" key={l.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upload(l.src)} width={l.w} height={l.h} alt={l.alt} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
