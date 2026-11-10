import type { Metadata } from "next";
import WpPage from "@/components/wp/WpPage";
import { getPageDoc } from "@/lib/wp/snapshot";

export const metadata: Metadata = { title: "Page Not Found - Techversant Infotech", robots: "noindex" };

/** The WordPress 404 page (title banner + "Oops! Page Not Found!") rendered by the same Elementor renderer. */
export default function NotFound() {
  const doc = getPageDoc("/404/");
  return doc ? <WpPage doc={doc} /> : <p>Page not found.</p>;
}
