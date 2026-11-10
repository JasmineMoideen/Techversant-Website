import CenterTitle from "@/components/ui/CenterTitle";
import { hotspotImage, hotspots } from "@/content/home";
import { upload } from "@/lib/assets";
import MapPins from "./MapPins";

/** Responsive candidates WordPress generated for Map.webp (the browser picks one from `sizes`, exactly like the live page). */
const MAP_WIDTHS: [string, number][] = [
  ["Map.webp", 2560],
  ["Map-300x141.webp", 300],
  ["Map-1024x480.webp", 1024],
  ["Map-768x360.webp", 768],
  ["Map-1536x720.webp", 1536],
  ["Map-2048x960.webp", 2048],
];

/** Home: "We operate globally" — dotted world map with six white hotspot pins on a navy band. */
export default function WorldMap() {
  return (
    <section className="sec worldmap">
      <CenterTitle eyebrow="We operate globally" title="USA | UK | Australia | Canada | UAE | India" tone="light" />
      <div className="map-wrap">
        <div className="map-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={upload(hotspotImage)}
            srcSet={MAP_WIDTHS.map(([f, w]) => `${upload(`2025/01/${f}`)} ${w}w`).join(", ")}
            sizes="(max-width: 2560px) 100vw, 2560px"
            width={2560}
            height={1200}
            alt="Map"
          />
          <MapPins hotspots={hotspots} />
        </div>
      </div>
    </section>
  );
}
