import Link from "next/link";
import CenterTitle from "@/components/ui/CenterTitle";
import ClickableCard from "@/components/ui/ClickableCard";
import SeeMore from "@/components/ui/SeeMore";
import { projects, projectsMobile } from "@/content/home";
import { upload } from "@/lib/assets";
import ProjectCarousel from "./ProjectCarousel";

/** Home: "Our Insights — Transforming Ideas Into Reality" (3 project cards). */
export default function ProjectsTeaser() {
  return (
    <section className="sec insights">
      <div className="sec-inner">
        <CenterTitle eyebrow="Our Insights" title="Transforming Ideas Into Reality" text="Our expertise reflected through successful projects." />
        <div className="proj-grid">
          {projects.map((p) => (
            <ClickableCard className="proj-card" href={p.href} key={p.href}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upload(p.img)} width={550} height={550} alt={p.alt} />
              <div className="proj-content">
                <h3 className="proj-title">
                  <Link href={p.href}>{p.title}</Link>
                </h3>
                <div className="proj-excerpt">{p.excerpt}</div>
              </div>
            </ClickableCard>
          ))}
        </div>
        <ProjectCarousel items={projectsMobile} />
        <div className="see-more-row">
          <SeeMore href="/customer-stories/" />
        </div>
      </div>
    </section>
  );
}
