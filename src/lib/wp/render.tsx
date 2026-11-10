import parse, { attributesToProps, domToReact, Element, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import Link from "next/link";
import type { ReactNode } from "react";
import { assetSrcset, assetUrl, cfMailto, cssUrls, decodeCfEmail, pageHref } from "./rewrite";

/** Elements that only exist for WordPress' own JS/SEO and must not reach the React tree. */
const DROP = new Set(["script", "noscript", "link", "meta", "template"]);

function normalizeAttribs(el: Element) {
  const a = el.attribs;
  // LiteSpeed lazy-loading: <img src="data:…1x1 gif" data-src="real"> — kept as is (a client script swaps the
  // real image in when it nears the viewport, exactly like the live site). Grids are laid out while the
  // placeholders are still 1x1, which is part of the layout the live site renders.
  if (a["data-src"]) a["data-src"] = assetUrl(a["data-src"]);
  if (a["data-srcset"]) a["data-srcset"] = assetSrcset(a["data-srcset"]);
  // An empty src makes browsers re-request the page (React warns about it); WordPress emits a few.
  for (const k of ["src", "srcset"]) if (a[k] !== undefined && !a[k].trim()) delete a[k];
  for (const k of ["src", "poster", "data-poster"]) if (a[k]) a[k] = assetUrl(a[k]);
  if (a.srcset) a.srcset = assetSrcset(a.srcset);
  if (a.style) a.style = cssUrls(a.style);
  if (a["data-settings"]) a["data-settings"] = a["data-settings"].replace(/https?:\\?\/\\?\/(?:www\.)?techversantinfotech\.com/gi, "/wp-assets");
}

const options: HTMLReactParserOptions = {
  replace(node) {
    if (!(node instanceof Element)) return undefined;
    if (DROP.has(node.name)) return <></>;
    // Cloudflare e-mail obfuscation: the element becomes the decoded address (as the CF script does in the browser).
    if (node.attribs["data-cfemail"]) return <>{decodeCfEmail(node.attribs["data-cfemail"])}</>;
    normalizeAttribs(node);
    // Contact Form 7's script appends a (hidden) spinner after submit buttons; it takes up layout space.
    if (node.name === "input" && /\bhas-spinner\b/.test(node.attribs.class ?? "")) {
      return (
        <>
          <input {...attributesToProps(node.attribs)} />
          <span className="wpcf7-spinner" />
        </>
      );
    }
    if (node.name === "a" && node.attribs.href) {
      const mail = cfMailto(node.attribs.href);
      if (mail) node.attribs.href = mail;
      const { href, internal } = pageHref(node.attribs.href);
      node.attribs.href = href;
      if (internal && !node.attribs.target) {
        const props = attributesToProps(node.attribs);
        delete props.href;
        return (
          <Link href={href} {...props}>
            {domToReact(node.children as DOMNode[], options)}
          </Link>
        );
      }
    }
    return undefined;
  },
};

/** Turns WordPress-rendered (Elementor) HTML into React elements; interactive widgets are enhanced client-side. */
export function renderWpHtml(html: string): ReactNode {
  return parse(html, options);
}
