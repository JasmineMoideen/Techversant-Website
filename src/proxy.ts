import { NextResponse, type NextRequest } from "next/server";
import routeIndex from "../content/snapshot/html/_index.json";

/**
 * Real 404 status codes. The catch-all page streams, and once streaming has started Next can no longer change the
 * status (an unknown URL would answer `200` with the "Page Not Found" markup). So unknown paths are answered here,
 * before anything renders: the request is rewritten to the 404 page with a 404 status.
 *
 * Phase A knows its routes from the snapshot index. Phase B replaces `known` with the WordPress route list
 * (sitemap / REST), cached and revalidated on publish.
 */
const known = new Set<string>(["/", ...Object.values(routeIndex as Record<string, { route: string; status: number }>).filter((e) => e.status === 200).map((e) => e.route)]);

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (known.has(path.endsWith("/") ? path : `${path}/`)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/404/", request.url), { status: 404 });
}

export const config = {
  // Everything except Next internals, the API routes and the files served from /public.
  matcher: ["/((?!api/|_next/|wp-assets/|wp/|fonts/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
