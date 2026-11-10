import type { Metadata } from "next";
import { assetUrl } from "./rewrite";
import type { PageDoc } from "./snapshot";

const toRobots = (robots: string | null): Metadata["robots"] => {
  if (!robots) return undefined;
  const parts = robots.split(",").map((s) => s.trim());
  const out: Record<string, unknown> = { index: !parts.includes("noindex"), follow: !parts.includes("nofollow") };
  for (const p of parts) {
    const m = /^(max-snippet|max-video-preview|max-image-preview):(.+)$/.exec(p);
    if (m) out[m[1]] = m[2] === "-1" || /^\d+$/.test(m[2]) ? Number(m[2]) : m[2];
  }
  return out as Metadata["robots"];
};

/** Maps the SEO tags of a WordPress page (Rank Math output) onto Next's metadata object. */
export function buildMetadata(doc: PageDoc): Metadata {
  const og = doc.openGraph;
  const image = og["og:image"]
    ? [{ url: og["og:image"], width: Number(og["og:image:width"]) || undefined, height: Number(og["og:image:height"]) || undefined, alt: og["og:image:alt"], type: og["og:image:type"] }]
    : undefined;
  const icons = doc.icons.filter((i) => i.rel === "icon");
  const apple = doc.icons.filter((i) => i.rel === "apple-touch-icon");
  return {
    title: { absolute: doc.title },
    description: doc.description,
    alternates: doc.canonical ? { canonical: doc.canonical } : undefined,
    robots: toRobots(doc.robots),
    openGraph: {
      type: (og["og:type"] as "article" | "website") ?? "website",
      locale: og["og:locale"],
      title: og["og:title"] ?? doc.title,
      description: og["og:description"] ?? doc.description,
      url: og["og:url"],
      siteName: og["og:site_name"],
      images: image,
    },
    twitter: {
      card: (doc.twitter.card as "summary_large_image") ?? "summary_large_image",
      title: doc.twitter.title,
      description: doc.twitter.description,
      images: doc.twitter.image ? [doc.twitter.image] : undefined,
    },
    icons: {
      // the mirrored copies: pages must not hotlink the live site
      icon: icons.map((i) => ({ url: assetUrl(i.href), sizes: i.sizes })),
      apple: apple.map((i) => ({ url: assetUrl(i.href), sizes: i.sizes })),
    },
    other: {
      ...(doc.twitter.label1 ? { "twitter:label1": doc.twitter.label1, "twitter:data1": doc.twitter.data1 ?? "" } : {}),
      ...(og["og:updated_time"] ? { "og:updated_time": og["og:updated_time"] } : {}),
    },
  };
}
