/**
 * CSS processing for the WordPress/Elementor content area (see scripts/build/wp-css.ts):
 *  - scopes every selector under `.wp-page` (the wrapper of an inner page) so the live theme's global rules
 *    can never leak into the hand-built shell/home page,
 *  - purges rules that cannot match any class/id/tag used by the snapshot pages,
 *  - rewrites url(...) to the local asset mirror and collects the referenced files,
 *  - keeps only the @font-face / @keyframes that the surviving rules use.
 */
import postcss, { type AtRule, type Container, type Declaration, type Root, type Rule } from 'postcss';
import selectorParser, { type Node as SelNode, type Selector } from 'postcss-selector-parser';

export const SCOPE = 'wp-page';

export type Used = {
  classes: Set<string>;
  ids: Set<string>;
  tags: Set<string>;
  /** Classes WordPress puts on <body>/<html> only (e.g. elementor-kit-7): rules keyed on them target the wrapper itself. */
  bodyOnly: Set<string>;
  /** Classes present both on <body> and on content elements (e.g. `page`): rules may mean either. */
  ambiguous: Set<string>;
};

/** Classes added by JS at runtime (Swiper, Bootstrap collapse, Elementor, Isotope …) — never purged. */
const DYNAMIC_CLASS =
  /^(label|option|list|current|last|scroll|above|swiper|slick|owl|mfp|show|collapse|collapsing|collapsed|active|open|in|fade|animated|is-|has-|e-lazyloaded|elementor-sticky|elementor-motion|nice-select|isotope|jarallax|lazyloaded|selected|current|focus|visible|hidden|disabled|loading|loaded|wpcf7-|awsm-|sticky|stuck|tm-stretched|tm-col-stretched|tm-bgimage|tm-bgcolor|tm-item-appeared)/;

export type Options = {
  /** Purge info; null keeps every rule. */
  used: Used | null;
  /** Base URL of the stylesheet (to resolve relative url()s). */
  baseUrl: string;
  /** Collected absolute URLs of assets referenced from url(). */
  assets: Set<string>;
  /** Keep :root / html rules unscoped (used for the shared bundle's custom properties). */
  keepRoot?: boolean;
};

const SITE_HOSTS = new Set(['techversantinfotech.com', 'www.techversantinfotech.com']);

export function rewriteAssetUrl(raw: string, baseUrl: string, assets: Set<string>): string {
  const u = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('about:')) return raw;
  let abs: URL;
  try {
    abs = new URL(u.startsWith('//') ? 'https:' + u : u, baseUrl);
  } catch {
    return raw;
  }
  if (SITE_HOSTS.has(abs.hostname) && /^\/wp-(content|includes)\//.test(abs.pathname)) {
    void assets;
    return `"/wp-assets${abs.pathname}${abs.hash}"`;
  }
  return raw;
}

const URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s'"][^)]*?))\s*\)/g;

function rewriteValue(value: string, opts: Options): string {
  return value.replace(URL_RE, (m, a, b, c) => {
    const inner = (a ?? b ?? c) as string;
    const out = rewriteAssetUrl(inner, opts.baseUrl, opts.assets);
    return out === inner ? m : `url(${out})`;
  });
}

/** Theme CSS names the font "DM Sans"; the app serves it through next/font under a generated family name. */
function mapFontFamily(value: string): string {
  return value.replace(/(["'])DM Sans\1|(?<![\w-])DM Sans(?![\w-])/gi, 'var(--font-dm-sans)');
}

function isInsidePseudo(node: SelNode): boolean {
  for (let p = node.parent as SelNode | undefined; p; p = p.parent as SelNode | undefined) {
    if (p.type === 'pseudo') return true;
  }
  return false;
}

function selectorIsUsed(sel: Selector, used: Used): boolean {
  let ok = true;
  sel.walk((n) => {
    if (!ok || isInsidePseudo(n)) return;
    if (n.type === 'class') {
      if (!used.classes.has(n.value) && !DYNAMIC_CLASS.test(n.value)) ok = false;
    } else if (n.type === 'id') {
      if (!used.ids.has(n.value)) ok = false;
    } else if (n.type === 'tag') {
      const t = n.value.toLowerCase();
      if (t !== 'html' && t !== 'body' && !used.tags.has(t) && !/^(from|to|\d+%)$/.test(t)) ok = false;
    }
  });
  return ok;
}

function scopeSelector(sel: Selector, keepRoot: boolean): void {
  const first = sel.first;
  if (!first) return;
  const scopeClass = () => selectorParser.className({ value: SCOPE });
  const descendant = () => selectorParser.combinator({ value: ' ' });

  const stripHtml = () => {
    // `html body …` / `html .x …` -> drop `html` and its combinator.
    sel.first.remove();
    if (sel.first && sel.first.type === 'combinator') sel.first.remove();
  };

  if (first.type === 'tag' && first.value.toLowerCase() === 'html') {
    const next = first.next();
    const bodyFollows = next && next.type === 'combinator' && next.next()?.type === 'tag' && (next.next() as SelNode & { value: string }).value.toLowerCase() === 'body';
    if (bodyFollows) {
      stripHtml();
    } else if (!next || next.type === 'combinator') {
      // `html .x` / bare `html`
      if (!next) {
        if (keepRoot) return;
        first.replaceWith(scopeClass());
        return;
      }
      first.replaceWith(scopeClass());
      return;
    } else {
      // `html.js .x`, `html:not(...)` — html-level classes are mirrored onto the wrapper
      first.replaceWith(scopeClass());
      return;
    }
  }
  const head = sel.first;
  if (head.type === 'tag' && head.value.toLowerCase() === 'body') {
    head.replaceWith(scopeClass());
    return;
  }
  if (head.type === 'pseudo' && head.value === ':root') {
    if (keepRoot && sel.nodes.length === 1) return;
    head.replaceWith(scopeClass());
    return;
  }
  sel.prepend(descendant());
  sel.prepend(scopeClass());
}

function processSelectors(selectorText: string, opts: Options): string | null {
  let out: string | null = null;
  const proc = selectorParser((root) => {
    const kept: Selector[] = [];
    root.each((sel) => {
      if (opts.used && !selectorIsUsed(sel, opts.used)) return;
      kept.push(sel);
    });
    if (kept.length === 0) {
      out = null;
      return;
    }
    root.removeAll?.();
    for (const s of kept) {
      const head = s.first;
      if (opts.used && head && head.type === 'class') {
        if (opts.used.bodyOnly.has(head.value)) {
          s.prepend(selectorParser.className({ value: SCOPE }));
          root.append(s);
          continue;
        }
        if (opts.used.ambiguous.has(head.value)) {
          const asDescendant = s.clone();
          scopeSelector(asDescendant, !!opts.keepRoot);
          s.prepend(selectorParser.className({ value: SCOPE }));
          root.append(s);
          root.append(asDescendant);
          continue;
        }
      }
      scopeSelector(s, !!opts.keepRoot);
      root.append(s);
    }
    out = root.toString();
  });
  try {
    proc.processSync(selectorText);
  } catch {
    return null;
  }
  return out;
}

function isKeyframes(at: AtRule) {
  return /keyframes$/i.test(at.name);
}

/** The live stylesheets contain a few stray `}` that browsers skip; PostCSS rejects them, so cut them out. */
function tolerantParse(css: string): Root {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return postcss.parse(css);
    } catch (e) {
      const err = e as { reason?: string; line?: number; column?: number };
      if (err.reason !== 'Unexpected }' || !err.line || !err.column) throw e;
      const lines = css.split('\n');
      const line = lines[err.line - 1];
      lines[err.line - 1] = line.slice(0, err.column - 1) + line.slice(err.column);
      css = lines.join('\n');
    }
  }
  return postcss.parse(css);
}

export function processCss(css: string, opts: Options): string {
  const root: Root = tolerantParse(css);
  const keptFontFaces: AtRule[] = [];
  const keyframes: AtRule[] = [];

  root.walkAtRules((at) => {
    if (at.name === 'charset' || at.name === 'import') at.remove();
  });

  const collectContainer = (c: Container) => {
    c.each((node) => {
      if (node.type === 'rule') {
        const rule = node as Rule;
        // Keyframe steps (from/to/50%) live inside @keyframes and are handled there.
        if (rule.parent && rule.parent.type === 'atrule' && isKeyframes(rule.parent as AtRule)) return;
        // Elementor hides background images of lower containers until its JS marks them `.e-lazyloaded`;
        // we render them straight away, so drop that optimisation rule.
        if (rule.selector.includes('.e-lazyloaded')) {
          rule.remove();
          return;
        }
        const sel = processSelectors(rule.selector, opts);
        if (sel === null) {
          rule.remove();
          return;
        }
        rule.selector = sel;
        // `body { overflow-x: hidden }` propagates to the viewport on the live site. Mapped onto the `.wp-page`
        // wrapper it would turn that element into a scroll container (and a compositing layer), so the real
        // <body> gets the overflow instead (see styles/base.css) and the wrapper does not.
        if (sel.split(',').every((part) => /^\s*\.wp-page(\.[\w-]+)*\s*$/.test(part))) rule.walkDecls(/^overflow(-[xy])?$/, (d) => void d.remove());
        rule.walkDecls((d: Declaration) => {
          if (/url\(/i.test(d.value)) d.value = rewriteValue(d.value, opts);
          if (/font-family|font$|^--/.test(d.prop) && /DM Sans/i.test(d.value)) d.value = mapFontFamily(d.value);
        });
      } else if (node.type === 'atrule') {
        const at = node as AtRule;
        if (at.name === 'font-face') {
          keptFontFaces.push(at);
          at.walkDecls((d) => {
            if (/url\(/i.test(d.value)) d.value = rewriteValue(d.value, opts);
          });
        } else if (isKeyframes(at)) {
          keyframes.push(at);
        } else if (at.nodes) {
          collectContainer(at);
          if (at.nodes.length === 0) at.remove();
        }
      }
    });
  };
  collectContainer(root);

  // Which families / animations survive?
  let blob = '';
  root.walkDecls((d) => {
    if (d.parent && d.parent.type === 'atrule' && (d.parent as AtRule).name === 'font-face') return;
    if (/^(font|font-family|animation|animation-name|--)/.test(d.prop)) blob += ` ${d.prop}:${d.value}`;
  });
  const lower = blob.toLowerCase();

  for (const ff of keptFontFaces) {
    let family = '';
    ff.walkDecls('font-family', (d) => {
      family = d.value.replace(/^['"]|['"]$/g, '').toLowerCase();
    });
    if (opts.used && family && !lower.includes(family)) {
      ff.remove();
      continue;
    }
    // Keep woff2/woff when present (drop eot/svg/ttf fallbacks => fewer files to mirror).
    ff.walkDecls('src', (d) => {
      const parts = d.value.split(/,(?![^(]*\))/);
      const modern = parts.filter((p) => /woff2?/i.test(p));
      if (modern.length) d.value = modern.join(',');
    });
  }
  for (const kf of keyframes) {
    if (opts.used && !lower.includes(kf.params.toLowerCase())) kf.remove();
  }

  const output = root.toString();
  // Mirror only what the surviving rules reference.
  for (const m of output.matchAll(/url\(\s*["']?\/wp-assets(\/[^"')#\s]+)/g)) {
    opts.assets.add('https://techversantinfotech.com' + m[1]);
  }
  return output;
}
