"use client";

import { useEffect, useState } from "react";

/** The theme's floating "scroll to top" button: appears after 600px of scrolling, jumps back to the top on click. */
export default function ScrollToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`scroll-to-top${shown ? " is-shown" : ""}`}>
      <a
        className="scroll-link"
        href="#"
        aria-label="Scroll to top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      >
        <i className="lnr-arrow-up" aria-hidden="true" />
      </a>
    </div>
  );
}
