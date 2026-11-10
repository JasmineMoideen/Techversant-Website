/**
 * The live site's own "custom JavaScript" snippet (Insert Headers & Footers), ported 1:1 — these behaviours are not
 * part of any plugin:
 *  - `.service-block-style3`: clicking the featured image follows the block's title link.
 *  - `.isotope-item` cards: the whole card is clickable (cursor: pointer) and goes to its `.content .title a`; a click
 *    on the link itself is left alone.
 *  - `.my-sticky-container` (the breadcrumb bar): shown once the page is scrolled past 200px; while the mobile menu is
 *    open it is sent behind the menu and the page cannot scroll.
 * (The Contact Form 7 "Sending..." / "Submit" button labels live in cf7.ts, the "already applied" job form in
 * awsm-application.ts.)
 */
export function initSiteScripts(root: ParentNode): () => void {
  const cleanups: (() => void)[] = [];

  root.querySelectorAll<HTMLElement>(".service-block-style3").forEach((block) => {
    const link = block.querySelector<HTMLAnchorElement>(".service-title a");
    const img = block.querySelector<HTMLElement>(".service-featured-img img");
    if (!link || !img) return;
    img.style.cursor = "pointer";
    const go = () => {
      window.location.href = link.href;
    };
    img.addEventListener("click", go);
    cleanups.push(() => img.removeEventListener("click", go));
  });

  root.querySelectorAll<HTMLElement>(".isotope-item").forEach((block) => {
    const link = block.querySelector<HTMLAnchorElement>(".content .title a");
    if (!link || !link.href) return;
    block.style.cursor = "pointer";
    const go = () => {
      window.location.href = link.href;
    };
    const stop = (e: Event) => e.stopPropagation();
    block.addEventListener("click", go);
    link.addEventListener("click", stop);
    cleanups.push(() => {
      block.removeEventListener("click", go);
      link.removeEventListener("click", stop);
    });
  });

  const bar = document.querySelector<HTMLElement>(".my-sticky-container");
  if (bar) {
    const menu = document.querySelector<HTMLElement>(".m-drawer");
    const update = () => {
      const open = !!menu?.classList.contains("is-open");
      if (open) {
        bar.classList.add("behind");
        bar.classList.remove("show");
        document.body.style.overflow = "hidden";
      } else {
        bar.classList.remove("behind");
        document.body.style.overflow = "";
        bar.classList.toggle("show", window.scrollY > 200);
      }
    };
    const observer = menu ? new MutationObserver(update) : null;
    if (menu) observer?.observe(menu, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("scroll", update, { passive: true });
    update();
    cleanups.push(() => {
      observer?.disconnect();
      window.removeEventListener("scroll", update);
      document.body.style.overflow = "";
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
