/**
 * The theme animates section titles (`.tm-split-text.split-in-right`) with GSAP SplitText 3.6.1:
 * lines > words > characters, characters fly in from the right when the title reaches 90% of the viewport.
 * This reproduces the resulting DOM (`div.split-line` per rendered line, `display:inline-block` word and
 * character boxes — which also determines where lines break) and the animation, without GSAP.
 */

const BOX = "position:relative;display:inline-block;";

function words(text: string, chars: HTMLElement[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (part === "") continue;
    if (/^\s+$/.test(part)) {
      frag.append(document.createTextNode(" "));
      continue;
    }
    const word = document.createElement("div");
    word.setAttribute("style", BOX);
    for (const ch of Array.from(part)) {
      const c = document.createElement("div");
      c.setAttribute("style", BOX);
      c.textContent = ch;
      word.append(c);
      chars.push(c);
    }
    frag.append(word);
  }
  return frag;
}

/** Replace text nodes by word/character boxes; `<br>` no longer forces a break (SplitText removes it). */
function splitNodes(parent: Node, chars: HTMLElement[]) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.replaceWith(words(node.textContent ?? "", chars));
    } else if (node instanceof HTMLBRElement) {
      const prev = node.previousSibling?.textContent ?? "";
      const next = node.nextSibling?.textContent ?? "";
      node.replaceWith(/\s$/.test(prev) || /^\s/.test(next) ? document.createTextNode("") : document.createTextNode(" "));
    } else if (node instanceof HTMLElement) {
      splitNodes(node, chars);
    }
  }
}

/**
 * SplitText(type: "lines,words,chars") on the live site ends up with exactly ONE `div.split-line` per heading — also
 * for headings that wrap over several rows (verified on dozens of live headings) — so everything goes into a single
 * block and wraps naturally inside it.
 */
function wrapLines(el: HTMLElement) {
  const line = document.createElement("div");
  line.className = "split-line";
  // SplitText keeps the heading's own alignment on the line box.
  line.setAttribute("style", `display: block; text-align: ${getComputedStyle(el).textAlign}; position: relative;`);
  for (const child of Array.from(el.childNodes)) {
    // Whitespace-only text around the content is dropped.
    if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) continue;
    line.append(child);
  }
  el.replaceChildren(line);
}

export function initSplitText(root: ParentNode): () => void {
  const timers: number[] = [];
  const observers: IntersectionObserver[] = [];
  let cancelled = false;

  root.querySelectorAll<HTMLElement>(".tm-split-text").forEach((el) => {
    // The theme runs its handler 200ms after the widget is ready (with the page's web fonts already loaded: the
    // line breaks are measured once and then frozen, so they must be measured with the final font).
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      timers.push(
      window.setTimeout(() => {
        if (el.querySelector(".split-line")) return;
        const chars: HTMLElement[] = [];
        splitNodes(el, chars);
        wrapLines(el);
        el.style.perspective = "400px";
        // `split-in-right`: chars start 50px to the right, transparent.
        chars.forEach((c) => {
          c.style.opacity = "0";
          c.style.transform = "translate(50px, 0px)";
        });
        const play = () => {
          chars.forEach((c, i) => {
            const anim = c.animate([{ opacity: 0, transform: "translate(50px, 0px)" }, { opacity: 1, transform: "translate(0px, 0px)" }], {
              duration: 800,
              delay: i * 20,
              easing: "cubic-bezier(0.5, 1, 0.89, 1)",
              fill: "both",
            });
            anim.onfinish = () => {
              // GSAP leaves only inline end-state styles behind. A finished `fill: both` animation would keep every
              // character on its own compositor layer (and make everything painted after it "overlap" layers too),
              // which turns the text of the whole page from LCD into grayscale anti-aliasing — drop it.
              c.style.opacity = "1";
              c.style.transform = "translate(0px, 0px)";
              anim.cancel();
            };
          });
        };
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                play();
                io.disconnect();
              }
            }
          },
          { rootMargin: "0px 0px -10% 0px" },
        );
        io.observe(el);
        observers.push(io);
      }, 200),
      );
    });
  });

  return () => {
    cancelled = true;
    timers.forEach((t) => window.clearTimeout(t));
    observers.forEach((o) => o.disconnect());
  };
}
