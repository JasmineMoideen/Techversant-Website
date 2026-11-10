# Techversant — Next.js front end

A pixel-faithful Next.js rebuild of <https://techversantinfotech.com/> (a WordPress + Elementor site). WordPress becomes
the CMS/back end later (Phase B); this repo is the front end (Phase A: everything is built from the live site, read-only —
nothing in here ever writes to production).

```bash
source env.sh            # Node 24 from ~/.local (the system Node is too old for Next 16)
pnpm dev                 # http://localhost:3000
pnpm build && pnpm start # production build (static pages for every route), -p 3001 to keep dev running
pnpm typecheck && pnpm lint
```

## How the site is built

| Part | Where | How |
| --- | --- | --- |
| Home page `/` | `src/app/page.tsx`, `src/components/sections/*`, `src/styles/home*.css` | hand-built components, CSS measured from the live site |
| Header (desktop mega menu, sticky copy, mobile drawer), footer, cookie banner/panel, contact block, scroll-to-top | `src/components/shell/*`, `src/components/sections/Contact*`, `src/styles/shell.css`, `sections.css` | hand-built; behaviour copied from the live theme scripts |
| **Every other route** (~205: industries, services, technology, projects, jobs, news, legal, …) | `src/app/[...slug]/page.tsx` → `src/components/wp/WpPage.tsx` | the page's Elementor HTML is rendered by `src/lib/wp/render.tsx` (html-react-parser); behaviour comes from `src/components/wp/enhance/*` |
| 404 (real `404` status) | `src/proxy.ts`, `src/app/not-found.tsx` | the proxy knows every route from the snapshot index and rewrites anything else to the 404 page *with* a 404 status (the catch-all streams, so the status cannot be changed later) |
| `robots.txt`, `sitemap.xml`, favicon / `<head>` metadata | `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/wp/metadata.ts` | from the snapshot (title, description, canonical, Open Graph, icons) |
| Fonts | `src/styles/fonts.css`, `public/fonts/dm-sans-*.woff2` | the live site's own DM Sans variable files (wght 100–900), self-hosted — static instances drift by sub-pixels |
| Forms and job list back end (Phase A stand-ins) | `src/app/api/forms/contact`, `src/app/api/forms/application`, `src/app/api/jobs`, `src/lib/wp/jobs.ts` | answer in the same JSON / HTML shapes as Contact Form 7 and the WP Job Openings plugin, so the client code is unchanged when Phase B proxies them to WordPress |

Why the Elementor renderer: ~16 templates × 5 viewports cannot be hand-tuned, and it keeps WordPress editing intact —
in Phase B `src/lib/wp/snapshot.ts` (the `PageDoc` contract), `src/lib/wp/jobs.ts` and the `api/*` routes are replaced by
WordPress-backed ones and the rest stays. Elementor `data-id`s are identical live vs local, which is what makes
`scripts/fidelity/iddiff.ts` work.

### Content and CSS pipeline (all read-only against the live site)

```bash
pnpm snapshot:routes     # route manifest (content/routes.json)
pnpm snapshot:raw        # REST snapshot (pages/posts/jobs)
pnpm snapshot:html       # full HTML of every route          -> content/snapshot/html   (--force to refetch)
pnpm snapshot:css        # every stylesheet the pages load   -> content/snapshot/css   (reads the HTML snapshot: run it second)
pnpm build:wp-css        # scope under .wp-page, purge, URL-rewrite -> public/wp/theme-<sig>.css (one bundle per
                         #   distinct stylesheet set a page loads on live) + content/generated/post-css/<id>.css
pnpm snapshot:assets && pnpm assets:mirror   # images/fonts -> public/wp-assets (served locally)
node scripts/extract/home.mjs && node scripts/extract/home-mobile.mjs   # home data (src/content/home*.generated.json)
```

Re-run `build:wp-css` after changing `scripts/lib/css-scope.ts`.

**The live site keeps changing** (typography, copy and plugin settings are edited all day), so a "re-sync" is a routine:
`snapshot:html --force` → `snapshot:css` → `build:wp-css` → `snapshot:assets` → `assets:mirror` → re-extract the home data →
restart the dev server (the snapshot is cached in module scope; for production remove `.next/cache` and rebuild) → recapture
the live references (below). Never trust measurements taken while the live site is mid-edit — re-sync and measure again.

### Behaviour that WordPress does with JavaScript

`src/components/wp/Enhancer.tsx` runs small ports of the live scripts on the server-rendered markup:
lazy images (LiteSpeed/vanilla-lazyload), Isotope `fitRows`/`masonry` grids, Royal Addons grids, PowerPack and
Bootstrap accordions, Swiper carousels (live runs Swiper 8, this app Swiper 14: loop clones, slides-per-view and gaps are
matched by `enhance/swiper.ts`), GSAP-SplitText-style title lines + letter animation, Elementor reveal-on-scroll,
stretched columns, Contact Form 7 (`enhance/cf7.ts`: live validation states, "Sending…"), WP Job Openings
(`enhance/awsm.ts`: Selectric dropdowns, filter, search, "Load more", deep links; `awsm-application.ts`: the application
form's jQuery-Validate behaviour, "already applied" cookie) and the site's own custom script snippet
(`enhance/site-scripts.ts`: clickable cards, sticky breadcrumb).

Animation finishing rule: anything animated with `animation-fill-mode: both` / WAAPI `fill: both` keeps its element on a
compositor layer after it finished, which flips the text of everything painted after it from LCD to grayscale
anti-aliasing. Live (GSAP) leaves no layers behind, so ported animations must *cancel* themselves after setting the end
state (see `enhance/splittext.ts`).

## Pixel-fidelity harness

```bash
pnpm fidelity:capture --routes /a/,/b/ --viewports 1440,390 --out fidelity/ref-new   # live site -> reference PNGs
scripts/fidelity/check.sh "/a/,/b/" "1440,390"        # local app -> fidelity/current, then diff
BASE=http://localhost:3001 scripts/fidelity/check.sh … # same, against the production build
```

Gate: page height ±2px and every 600px band ≤ 0.5% differing pixels. Debug helpers in `scripts/fidelity/`:
`iddiff.ts` (element geometry by Elementor `data-id`, live vs local — start here), `rows.py` / `side.py`
(find and view differing rows), `domtree.mjs`, `rects.mjs`, `styles.mjs`, `matched.mjs` (which CSS rules set a property),
`anchors.ts`, `imgs.ts`, `inlinestyles.ts`, `ancestors.ts`, `layerflags.ts` (compositing flags).
Both sites are put in the same deterministic state by `scripts/lib/freeze.ts` (animations off, lazy images forced,
carousels parked, grids settled by one synthetic resize).

Beyond still screenshots:

| Script | What it checks |
| --- | --- |
| `interact.ts` | ~30 interaction states, live vs local, pixel-diffed: mega-menu hovers, header CTA, scrolled/sticky header, mobile drawer, cookie banner + settings, accordions, home tile / button hovers, CF7 and job-application validation errors, job filter dropdown, scroll-to-top, sticky breadcrumb, card clicks. Nothing is ever sent to production: non-GET requests to the live origin are blocked and the CF7 REST answer is mocked inside the browser. Output: `fidelity/interact/<name>-{live,local,diff}.png`. |
| `motion.ts <route> [width]` | what animates / plays / auto-advances after load (CSS and Web animations, `<video>`, Swiper/slick autoplay), live vs local. |
| `a11y-perf.ts [--live]` | axe-core violations, LCP, CLS and JS weight per page, local vs live. |
| `sweep.ts` | every route × viewport on the local app: console errors/warnings, hydration errors, failed or ≥ 400 requests, horizontal overflow, broken images, one `<h1>`, canonical link. |

## Known and accepted differences

- Text anti-aliasing (LCD vs grayscale) of some home tile titles at ≤ 1024px: live keeps those tiles on compositor
  layers for reasons that depend on its scroll/transition history; the geometry is identical, only the sub-pixel colour
  fringes differ (0.6–0.7% in the affected 600px bands).
- Invisible fixes on purpose: the hero video plays (no `crossorigin`), one visually hidden `<h1>` per page that has none,
  `alt`/`aria-label`s on unnamed links, a real `404` status. Post-parity improvements are for a later decision.
- `/dpa/` header is 64.69px tall at ≤ 768px on live (other pages 63.5px); copied as is.
# Techversant-Website
