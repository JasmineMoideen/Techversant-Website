import CenterTitle from "@/components/ui/CenterTitle";
import PromoTile from "@/components/ui/PromoTile";
import SeeMore from "@/components/ui/SeeMore";
import { industryTiles } from "@/content/home";

/** Home: "Industries We Transform" — bento of six tiles (2 wide, 4 narrow). */
export default function Industries() {
  return (
    <section className="sec industries">
      <div className="sec-inner">
        <CenterTitle eyebrow="Industries We Transform" title="Tailored solutions for every sector" text="We understand the unique needs of every industry. Our strategies are built to deliver measurable impact." />
        {/* One grid: 4 columns on desktop (tiles 1 and 6 span two), 2 columns on tablet, 1 on mobile. */}
        <div className="bento">
          {industryTiles.map((t) => (
            <PromoTile key={t.href} href={t.href} img={t.img} titleHtml={t.titleHtml} />
          ))}
        </div>
        <div className="see-more-row">
          <SeeMore href="/industries/" />
        </div>
      </div>
    </section>
  );
}
