"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The fixed copy of the header (live theme: `#elementor-header-top-sticky`). It is hidden above the page header and
 * slides in (0.4s) once the page has scrolled past the header plus 20px; it never shows at 1024px and below, where
 * the page header itself is pinned.
 */
export default function StickyHeader({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const page = document.getElementById("header");
    if (!page) return;
    const update = () => {
      const box = page.getBoundingClientRect(); // fractional height (83.5), like jQuery's outerHeight()
      setVisible(window.innerWidth > 1024 && window.scrollY > box.top + window.scrollY + box.height + 20);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <header ref={ref} className={`site-header site-header--sticky${visible ? " visible" : ""}`} aria-hidden={!visible}>
      {children}
    </header>
  );
}
