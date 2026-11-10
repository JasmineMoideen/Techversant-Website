import type { Metadata } from "next";
import ContactSection from "@/components/sections/ContactSection";
import Hero from "@/components/sections/Hero";
import Industries from "@/components/sections/Industries";
import JoinUs from "@/components/sections/JoinUs";
import LogoStrip from "@/components/sections/LogoStrip";
import ProjectsTeaser from "@/components/sections/ProjectsTeaser";
import Services from "@/components/sections/Services";
import WhoWeAre from "@/components/sections/WhoWeAre";
import WorldMap from "@/components/sections/WorldMap";
import { buildMetadata } from "@/lib/wp/metadata";
import { getPageDoc } from "@/lib/wp/snapshot";

export function generateMetadata(): Metadata {
  const doc = getPageDoc("/");
  return doc ? buildMetadata(doc) : {};
}

export default function Home() {
  const doc = getPageDoc("/");
  return (
    <>
      {doc?.jsonLd.map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}
      <Hero />
      <WhoWeAre />
      <LogoStrip />
      <ProjectsTeaser />
      <Industries />
      <Services />
      <WorldMap />
      <JoinUs />
      <ContactSection />
    </>
  );
}
