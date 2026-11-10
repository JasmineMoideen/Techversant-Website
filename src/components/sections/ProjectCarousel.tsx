"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectCard } from "@/content/home";
import { upload } from "@/lib/assets";

const Arrow = ({ dir }: { dir: "l" | "r" }) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" style={dir === "r" ? { transform: "rotate(180deg)" } : undefined}>
    <path d="M14 8H2M7 3 2 8l5 5" fill="none" stroke="#000" strokeWidth="1.2" />
  </svg>
);

/** Mobile (≤767px) variant of "Our Insights": one project card per view with prev/next arrows. */
export default function ProjectCarousel({ items }: { items: ProjectCard[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  return (
    <div className="proj-carousel" role="group" aria-roledescription="carousel" aria-label="Projects">
      <div className="proj-carousel-clip">
        <div className="proj-carousel-track" style={{ transform: `translateX(${-i * 368}px)` }}>
          {items.map((p, k) => (
            <article className="proj-card proj-slide" key={`${p.img}-${k}`} aria-hidden={k !== i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upload(p.img)} width={338} height={350} alt={p.alt} />
              <div className="proj-content">
                {/* The live slider currently renders no title (and no link) on its phone slides. */}
                {p.title ? (
                  <h3 className="proj-title">
                    <Link href={p.href} tabIndex={k === i ? 0 : -1}>
                      {p.title}
                    </Link>
                  </h3>
                ) : null}
                <div className="proj-excerpt">{p.excerpt}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <button type="button" className="tm-arrow tm-arrow-prev" aria-label="Previous slide" onClick={() => setI((i - 1 + n) % n)}>
        <Arrow dir="l" />
      </button>
      <button type="button" className="tm-arrow tm-arrow-next" aria-label="Next slide" onClick={() => setI((i + 1) % n)}>
        <Arrow dir="r" />
      </button>
    </div>
  );
}
