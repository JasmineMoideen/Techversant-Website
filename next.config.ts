import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same URLs as WordPress (it uses trailing slashes), and no dev-mode badge in screenshots.
  trailingSlash: true,
  devIndicators: false,
  // Phase A serves the exact WordPress image files (no re-encoding) so pixels match; revisit later.
  images: { unoptimized: true },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
