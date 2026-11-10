"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A card whose whole surface goes to `href` (the live site's custom script does this for `.isotope-item` cards);
 * a click on a link inside the card keeps its own behaviour.
 */
export default function ClickableCard({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <article
      className={className}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        router.push(href);
      }}
    >
      {children}
    </article>
  );
}
