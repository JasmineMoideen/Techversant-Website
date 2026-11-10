import type { MetadataRoute } from "next";
import { listRoutes } from "@/lib/wp/snapshot";

const SITE = "https://techversantinfotech.com";

/** Every public page, by its canonical (trailing-slash) URL. Phase B: generated from WordPress, with `lastModified`. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = new Set(["/", ...listRoutes()]);
  routes.delete("/404/");
  return [...routes].sort().map((route) => ({ url: `${SITE}${route}` }));
}
