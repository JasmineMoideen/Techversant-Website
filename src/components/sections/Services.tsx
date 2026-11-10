import CenterTitle from "@/components/ui/CenterTitle";
import PromoTile from "@/components/ui/PromoTile";
import SeeMore from "@/components/ui/SeeMore";
import { serviceTiles } from "@/content/home";

/** Home: "Specialized services we offer" — 4 x 2 grid of service tiles. */
export default function Services() {
  return (
    <section className="sec services">
      <div className="sec-inner">
        <CenterTitle eyebrow="Our Services" title="Specialized services we offer" text="Explore our comprehensive IT services designed to accelerate your business growth." />
        <div className="svc-grid">
          {serviceTiles.map((t) => (
            <PromoTile key={t.href} href={t.href} img={t.img} titleHtml={t.titleHtml} className={t.hiddenOnMobile ? "hide-mobile" : ""} />
          ))}
        </div>
        <div className="see-more-row svc-more">
          <SeeMore href="/services/" />
        </div>
      </div>
    </section>
  );
}
