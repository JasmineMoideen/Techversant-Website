import Link from "next/link";
import SectionTitle from "@/components/ui/SectionTitle";
import { careers, collageImage, joinParagraph, testimonials } from "@/content/home";
import { upload } from "@/lib/assets";
import TestimonialSlider from "./TestimonialSlider";

/** Home: "Join with us — Be a part of our amazing team" (collage + careers CTA + testimonial slider). */
export default function JoinUs() {
  return (
    <section className="sec join">
      <div className="join-top">
        <div className="join-title">
          <SectionTitle eyebrow="Join with us" title="Be a part of|our amazing team" />
        </div>
        <p className="join-text">{joinParagraph}</p>
      </div>
      <div className="join-collage" style={{ backgroundImage: `url(${upload(collageImage)})` }} role="img" aria-label="The Techversant team" />
      <div className="join-bottom">
        <div className="join-cta">
          <h2 className="join-cta-title">{careers.heading}</h2>
          <Link className="btn-cyan" href={careers.btn.href}>
            <span>{careers.btn.text}</span>
          </Link>
        </div>
        <div className="join-quotes">
          <TestimonialSlider items={testimonials} />
        </div>
      </div>
    </section>
  );
}
