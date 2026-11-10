import PageHeading from "@/components/ui/PageHeading";
import { getPostCss, getThemeCss, type PageDoc } from "@/lib/wp/snapshot";
import { renderWpHtml } from "@/lib/wp/render";
import Enhancer from "./Enhancer";

/**
 * Pages whose stylesheet set lacks the theme rule that makes the header logo `display:block`: live renders the
 * logo inline there, which moves it down by the line-height gap (see `.logo-inline` in styles/shell.css).
 */
const INLINE_LOGO_ROUTES = new Set(["/dpa/"]);

/**
 * An inner page authored in WordPress/Elementor. The wrapper carries WordPress' body classes (theme CSS keys
 * off them) and every stylesheet rule is scoped under `.wp-page`, so it can never touch the hand-built shell.
 */
export default function WpPage({ doc }: { doc: PageDoc }) {
  const hasH1 = /<h1[\s>]/i.test(doc.mainHtml);
  const css = doc.postIds.map(getPostCss).join("\n");
  return (
    <div className={`wp-page ${doc.bodyClass}${doc.headerTransparent ? " header-overlay" : ""}${INLINE_LOGO_ROUTES.has(doc.route) ? " logo-inline" : ""}`}>
      <link rel="stylesheet" href={`/wp/${getThemeCss(doc.route)}`} precedence="wp-theme" />
      {css ? (
        <style href={`wp-post-css-${doc.route}`} precedence="wp-post">
          {css}
        </style>
      ) : null}
      {doc.jsonLd.map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}
      {hasH1 ? null : <PageHeading title={doc.title} />}
      <div className="main-content">{renderWpHtml(doc.mainHtml)}</div>
      <Enhancer />
    </div>
  );
}
