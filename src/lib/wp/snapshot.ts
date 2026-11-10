/**
 * Phase A content repository: pages come from the HTML snapshot of the live site
 * (content/snapshot/html, produced by `pnpm snapshot:html`). Phase B swaps this module for one that talks to
 * WordPress — `PageDoc` is the contract the renderer depends on, nothing else.
 */
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

export type PageDoc = {
  route: string;
  /** Document <title>. */
  title: string;
  description: string;
  canonical: string | null;
  robots: string | null;
  openGraph: Record<string, string>;
  /** Body classes WordPress put on <body> (theme CSS keys off them: page ids, layout flags). */
  bodyClass: string;
  /** Inner HTML of `.main-content`: the page-title banner template + the page content. */
  mainHtml: string;
  /** Elementor posts rendered inside mainHtml (their per-post CSS is needed). */
  postIds: number[];
  /** The page uses the theme's transparent header: content starts at y=0 underneath it (desktop). */
  headerTransparent: boolean;
  /** <meta name="twitter:*"> (without the prefix) and other named metas the SEO plugin emits. */
  twitter: Record<string, string>;
  /** Favicons from <link rel="icon"|"apple-touch-icon">. */
  icons: { rel: string; href: string; sizes?: string }[];
  /** JSON-LD blocks (Rank Math schema graph), as raw JSON strings. */
  jsonLd: string[];
};

const ROOT = process.cwd();
const HTML_DIR = path.join(ROOT, "content/snapshot/html");

type IndexEntry = { route: string; file: string; status: number };
let indexCache: Record<string, IndexEntry> | null = null;

function loadIndex(): Record<string, IndexEntry> {
  indexCache ??= JSON.parse(fs.readFileSync(path.join(HTML_DIR, "_index.json"), "utf8"));
  return indexCache!;
}

export function listRoutes(): string[] {
  return Object.values(loadIndex())
    .filter((e) => e.status === 200)
    .map((e) => e.route);
}

const docCache = new Map<string, PageDoc | null>();

export function getPageDoc(route: string): PageDoc | null {
  if (docCache.has(route)) return docCache.get(route)!;
  const entry = loadIndex()[route];
  let doc: PageDoc | null = null;
  if (entry && entry.status === 200) {
    const $ = cheerio.load(fs.readFileSync(path.join(HTML_DIR, entry.file), "utf8"));
    const main = $(".main-content").first();
    if (main.length) {
      const og: Record<string, string> = {};
      $('meta[property^="og:"]').each((_, el) => {
        const p = $(el).attr("property");
        const c = $(el).attr("content");
        if (p && c) og[p] = c;
      });
      const twitter: Record<string, string> = {};
      $('meta[name^="twitter:"]').each((_, el) => {
        const n = $(el).attr("name");
        const c = $(el).attr("content");
        if (n && c) twitter[n.replace("twitter:", "")] = c;
      });
      const icons: PageDoc["icons"] = [];
      $('link[rel="icon"], link[rel="apple-touch-icon"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) icons.push({ rel: $(el).attr("rel") as string, href, sizes: $(el).attr("sizes") });
      });
      const jsonLd: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        const t = $(el).text().trim();
        if (t) jsonLd.push(t);
      });
      const postIds = new Set<number>();
      main.find("[data-elementor-id]").each((_, el) => {
        const id = Number($(el).attr("data-elementor-id"));
        if (id) postIds.add(id);
      });
      doc = {
        route,
        title: $("title").first().text(),
        description: $('meta[name="description"]').attr("content") ?? "",
        canonical: $('link[rel="canonical"]').attr("href") ?? null,
        robots: $('meta[name="robots"]').attr("content") ?? null,
        openGraph: og,
        bodyClass: ($("body").attr("class") ?? "").replace(/\s+/g, " ").trim(),
        mainHtml: main.html() ?? "",
        postIds: [...postIds],
        headerTransparent: $("#elementor-header-top").hasClass("elementor-header-top-transparent"),
        twitter,
        icons,
        jsonLd,
      };
    }
  }
  docCache.set(route, doc);
  return doc;
}

/** Name of the theme CSS bundle (in /public/wp) that holds the stylesheets the live page loads. */
export function getThemeCss(route: string): string {
  try {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, "content/generated/css-map.json"), "utf8")) as Record<string, string>;
    return map[route] ?? Object.values(map)[0];
  } catch {
    return "";
  }
}

/** Processed (scoped, URL-rewritten) per-post Elementor CSS written by `pnpm build:wp-css`. */
export function getPostCss(postId: number): string {
  const file = path.join(ROOT, "content/generated/post-css", `${postId}.css`);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
