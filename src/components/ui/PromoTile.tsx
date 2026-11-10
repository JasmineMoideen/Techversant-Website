import Link from "next/link";
import { upload } from "@/lib/assets";

/** Royal-Elementor-Addons "promo box" (cover style): full-bleed image, grey overlay, centred white title. */
export default function PromoTile({
  href,
  img,
  titleHtml,
  className = "",
}: {
  href: string;
  img: string;
  titleHtml: string;
  className?: string;
}) {
  return (
    <div className={`promo ${className}`}>
      <Link className="promo-link" href={href} aria-label={titleHtml.replace(/<br\s*\/?>/g, " ").replace(/&amp;/g, "&")} />
      <div className="promo-bg" style={{ backgroundImage: `url(${upload(img)})` }} />
      <div className="promo-overlay" />
      <div className="promo-content">
        <div className="promo-icon" />
        <h3 className="promo-title">
          {/* Titles come from the CMS snapshot and may contain <br> + entities. */}
          <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </h3>
      </div>
    </div>
  );
}
