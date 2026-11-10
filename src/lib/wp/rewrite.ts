/**
 * URL rewriting for WordPress-authored HTML/CSS: media is served from the local mirror (Phase A) and links
 * to the site's own pages become root-relative so they navigate inside the app.
 * Phase B replaces the media base with the WordPress uploads URL (or a CDN) in one place.
 */
const SITE = /^https?:\/\/(?:www\.)?techversantinfotech\.com(?=[/?#]|$)/i;
const MEDIA_BASE = "/wp-assets";

/** https://techversantinfotech.com/wp-content/uploads/x.webp -> /wp-assets/wp-content/uploads/x.webp */
export function assetUrl(url: string): string {
  const u = url.trim();
  if (SITE.test(u)) return u.replace(SITE, MEDIA_BASE);
  if (/^\/wp-(content|includes)\//.test(u)) return MEDIA_BASE + u;
  return u;
}

// srcset is split on ASCII whitespace only (URLs may contain U+202F, which JS `\s` would treat as a separator).
export function assetSrcset(srcset: string): string {
  return srcset
    .split(/[ \t\r\n\f]*,[ \t\r\n\f]+/)
    .map((part) => {
      const [u, ...rest] = part.trim().split(/[ \t\r\n\f]+/);
      return [assetUrl(u), ...rest].join(" ");
    })
    .join(", ");
}

export function cssUrls(css: string): string {
  return css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (_m, q: string, u: string) => `url(${q}${assetUrl(u)}${q})`);
}

/** Link href: site pages -> root-relative path, uploads -> mirrored copy, everything else untouched. */
export function pageHref(href: string): { href: string; internal: boolean } {
  const h = href.trim();
  if (SITE.test(h)) {
    const rest = h.replace(SITE, "") || "/";
    if (/^\/wp-(content|includes)\//.test(rest)) return { href: MEDIA_BASE + rest, internal: false };
    if (/^\/wp-(admin|login|json)/.test(rest)) return { href: h, internal: false };
    return { href: rest, internal: true };
  }
  return { href: h, internal: false };
}

/**
 * Cloudflare "email address obfuscation" ships `<a class="__cf_email__" data-cfemail="hex">[email protected]</a>`
 * and decodes it in the browser. The first hex byte is an XOR key for the rest.
 */
export function decodeCfEmail(hex: string): string {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  try {
    return decodeURIComponent(escape(out));
  } catch {
    return out;
  }
}

const CF_HREF = "/cdn-cgi/l/email-protection#";
/** `…/cdn-cgi/l/email-protection#hex` -> `mailto:decoded`, otherwise null. */
export function cfMailto(href: string): string | null {
  const at = href.indexOf(CF_HREF);
  return at >= 0 ? `mailto:${decodeCfEmail(href.slice(at + CF_HREF.length))}` : null;
}
