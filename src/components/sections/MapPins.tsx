"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Hotspot } from "@/content/home";

/**
 * The six pins on the "We operate globally" map. On the live site they are PowerPack image hotspots
 * (`.pp-hot-spot-wrap`, role=button): a white pulse (`pp-glow`, 2s, infinite — stopped while hovered) and a Tooltipster
 * "grow" tooltip (white box, 2px #00b9ff border, 15px radius) that opens 300ms after the pointer arrives, sits on top of the
 * pin with its centre rounded down to a whole pixel, and closes 300ms after the pointer leaves (350ms scale-out).
 * Keyboard users open it with focus / Enter / Space and close it with Escape or blur.
 */
const DELAY = 300;
const SCALE_MS = 350;

type Tip = { i: number; pin: HTMLElement; shown: boolean };

function TooltipBox({ tip, text, onEnter, onLeave }: { tip: Tip; text: string; onEnter: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Measure first (hidden), then place: base bottom = pin top, base centre = pin centre. Tooltipster rounds twice:
  // target = floor(pin centre), left = floor(target - width / 2) (`coord.left` in its `__geometry` code).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = tip.pin.getBoundingClientRect();
    const cs = getComputedStyle(el); // laid-out size, unlike getBoundingClientRect() unaffected by the scale(0) start state
    const w = parseFloat(cs.width);
    const h = parseFloat(cs.height);
    setPos({ left: Math.floor(Math.floor(r.left + r.width / 2) - w / 2) + window.scrollX, top: r.top + window.scrollY - h });
  }, [tip.pin]);

  return createPortal(
    <div
      ref={ref}
      className={`pin-tip${tip.shown && pos ? " pin-tip--show" : ""}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="pin-tip__box">
        <div className="pin-tip__text">
          <p>{text}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MapPins({ hotspots }: { hotspots: Hotspot[] }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = useCallback(() => window.clearTimeout(timer.current), []);

  const open = useCallback(
    (i: number, pin: HTMLElement, delay: number) => {
      clear();
      timer.current = window.setTimeout(() => setTip((t) => (t && t.i === i ? { ...t, shown: true } : { i, pin, shown: true })), delay);
    },
    [clear],
  );
  const close = useCallback(
    (delay: number) => {
      clear();
      timer.current = window.setTimeout(() => {
        setTip((t) => (t ? { ...t, shown: false } : t));
        timer.current = window.setTimeout(() => setTip(null), SCALE_MS);
      }, delay);
    },
    [clear],
  );
  // Keep the tooltip while the pointer is on it (it is interactive on the live site).
  const keep = useCallback(() => {
    clear();
    setTip((t) => (t ? { ...t, shown: true } : t));
  }, [clear]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(0);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clear();
    };
  }, [close, clear]);

  return (
    <>
      {hotspots.map((h, i) => (
        <span
          className="pin"
          key={`${h.xPct}-${h.yPct}`}
          style={{ left: `${h.xPct}%`, top: `${h.yPct}%`, width: h.w, height: h.w }}
          role="button"
          tabIndex={0}
          aria-label={h.label}
          aria-expanded={tip?.i === i && tip.shown}
          aria-describedby={`pin-tip-${i}`}
          onMouseEnter={(e) => open(i, e.currentTarget, DELAY)}
          onMouseLeave={() => close(DELAY)}
          onFocus={(e) => open(i, e.currentTarget, 0)}
          onBlur={() => close(0)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (tip?.i === i && tip.shown) close(0);
              else open(i, e.currentTarget, 0);
            }
          }}
          onClick={(e) => {
            // Touch screens have no hover: a tap toggles the tooltip.
            if (window.matchMedia("(hover: none)").matches) {
              if (tip?.i === i && tip.shown) close(0);
              else open(i, e.currentTarget, 0);
            }
          }}
        />
      ))}
      {hotspots.map((h, i) => (
        <div key={`d-${i}`} id={`pin-tip-${i}`} role="tooltip" hidden>
          <p>{h.tooltip}</p>
        </div>
      ))}
      {tip && <TooltipBox key={tip.i} tip={tip} text={hotspots[tip.i].tooltip} onEnter={keep} onLeave={() => close(DELAY)} />}
    </>
  );
}
