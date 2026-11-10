"use client";

import { useState } from "react";
import type { Testimonial } from "@/content/home";
import { upload } from "@/lib/assets";

const Chevron = () => (
  <svg aria-hidden="true" viewBox="0 0 283.4 512" width="14" height="35">
    <polygon fill="#fff" points="54.5,256.3 283.4,485.1 256.1,512.5 0,256.3 0,256.3 27.2,229 256.1,0 283.4,27.4" />
  </svg>
);

/** "What our people say" — the wpr-testimonial carousel (one slide, arrows + dots). Autoplay comes later. */
export default function TestimonialSlider({ items }: { items: Testimonial[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  return (
    <div className="tslider" role="group" aria-roledescription="carousel" aria-label="What our people say">
      <div className="tslider-track" style={{ transform: `translateX(${-i * 100}%)` }}>
        {items.map((t, k) => (
          <figure className="tslide" key={t.name} aria-hidden={k !== i}>
            {/* DOM order mirrors the live widget: meta first, column-reverse puts the quote on top. */}
            <div className="tslide-meta">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upload(t.img)} width={96} height={89} alt={t.name} />
              <div>
                <div className="tslide-name">{t.name}</div>
                <div className="tslide-job">{t.job}</div>
              </div>
            </div>
            <div className="tslide-body">
              <div className="tslide-title">{t.title}</div>
              <p className="tslide-text">
                &quot;<em>{t.text}</em>.&quot;
              </p>
            </div>
          </figure>
        ))}
      </div>
      <button type="button" className="tarrow tarrow-prev" aria-label="Previous testimonial" onClick={() => setI((i - 1 + n) % n)}>
        <Chevron />
      </button>
      <button type="button" className="tarrow tarrow-next" aria-label="Next testimonial" onClick={() => setI((i + 1) % n)}>
        <Chevron />
      </button>
      <div className="tdots">
        {items.map((t, k) => (
          <button type="button" key={t.name} className={`tdot${k === i ? " on" : ""}`} aria-label={`Show testimonial ${k + 1}`} onClick={() => setI(k)} />
        ))}
      </div>
    </div>
  );
}
