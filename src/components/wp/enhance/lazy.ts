/**
 * Lazy images, as LiteSpeed/vanilla-lazyload does on the live site: `<img src="data:…gif" data-src="real">`
 * gets its real source when it comes within 300px of the viewport.
 */
export function initLazy(root: ParentNode): () => void {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-lazyloaded][data-src]"));
  if (imgs.length === 0) return () => {};

  const load = (img: HTMLImageElement) => {
    img.classList.add("entered");
    img.setAttribute("data-ll-status", "loading");
    const done = () => {
      img.classList.add("litespeed-loaded");
      img.setAttribute("data-ll-status", "loaded");
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", () => img.setAttribute("data-ll-status", "error"), { once: true });
    const sizes = img.getAttribute("data-sizes");
    const srcset = img.getAttribute("data-srcset");
    if (sizes) img.sizes = sizes;
    if (srcset) img.srcset = srcset;
    img.src = img.getAttribute("data-src") as string;
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        load(e.target as HTMLImageElement);
      }
    },
    { rootMargin: "300px" },
  );
  imgs.forEach((img) => {
    if (img.getAttribute("data-ll-status")) return;
    io.observe(img);
  });
  return () => io.disconnect();
}
