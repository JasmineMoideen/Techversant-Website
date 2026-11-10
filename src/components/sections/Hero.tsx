import { asset } from "@/lib/assets";

/**
 * Home hero: a looping background video (separate desktop and mobile files, as on the live site's two Slider
 * Revolution modules). On the live site the video never loads (S3 lacks CORS headers while the <video> has
 * `crossorigin`), so visitors see a blank block; here it plays as intended. The slider's poster image
 * (uploads/2026/06/main-banner.png) returns 404 on production, so no poster is used yet (TODO: extract frame 0).
 * Click-to-unmute is not built yet.
 */
export default function Hero() {
  return (
    <section className="hero" aria-label="Techversant — AI-powered business solutions">
      <h1 className="sr-only">AI-Powered Business Solutions</h1>
      <video className="hero-d" src={asset("/media/hero.mp4")} autoPlay muted loop playsInline preload="auto" />
      <video className="hero-m" src={asset("/media/hero-mobile.mp4")} autoPlay muted loop playsInline preload="none" />
    </section>
  );
}
