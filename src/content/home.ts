import generated from "./home.generated.json";
import mobile from "./home-mobile.generated.json";

/** Homepage content below the logo strip. Phase A reads the snapshot extracted from the live page
 *  (scripts/extract/home.mjs); Phase B replaces this with the WordPress repository. */
export type ProjectCard = { href: string; title: string; excerpt: string; img: string; alt: string };
export type Tile = { href: string; img: string; titleHtml: string; title: string };
export type Hotspot = { xPct: number; yPct: number; w: number; label: string; tooltip: string };
export type Testimonial = { name: string; job: string; title: string; text: string; img: string };

const tile = (b: { href: string; img: string; titleHtml: string; title: string }): Tile => ({
  href: b.href,
  img: b.img,
  titleHtml: b.titleHtml,
  title: b.title,
});

const boxes = generated.promoBoxes;

export const projects: ProjectCard[] = generated.projects;
/** Row-ordered: Healthcare (wide), Financial, Education / Retail, Real Estate, HR (wide). */
export const industryTiles: Tile[] = boxes.slice(0, 6).map(tile);
export const serviceTiles: (Tile & { hiddenOnMobile: boolean })[] = boxes.slice(12, 20).map((b) => ({
  ...tile(b),
  hiddenOnMobile: b.hidden.includes("elementor-hidden-mobile"),
}));
export const hotspots: Hotspot[] = generated.hotspots.map((h) => ({ xPct: h.xPct, yPct: h.yPct, w: h.w, label: h.label, tooltip: h.tooltip }));
export const hotspotImage = generated.hotspotImg;
export const joinParagraph = generated.join.para;
export const careers = generated.careers;
export const collageImage = generated.collage;

const seen = new Set<string>();
const uniqueTestimonials: Testimonial[] = generated.testimonials.filter((t) => {
  if (seen.has(t.name)) return false;
  seen.add(t.name);
  return true;
});
/** The live carousel is looped: the DOM starts with a clone of the last slide, so rotate to the real order. */
export const testimonials: Testimonial[] = [...uniqueTestimonials.slice(1), uniqueTestimonials[0]];

/**
 * Mobile-only "Our Insights" carousel (10 projects). The live DOM is a looped Swiper whose real slides appear in
 * rotated order; a parked carousel shows the first real slide.
 */
const mobileReal: ProjectCard[] = mobile.items
  .filter((i) => !i.dup)
  .map((i) => ({ href: i.href, title: i.title, excerpt: i.excerpt, img: i.img, alt: i.alt }));
const startAt = 0; // the freeze parks live's loop carousel on its first real slide
export const projectsMobile: ProjectCard[] = [...mobileReal.slice(startAt), ...mobileReal.slice(0, startAt)];
