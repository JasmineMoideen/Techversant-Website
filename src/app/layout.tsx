import type { Metadata } from "next";
import { preload } from "react-dom";
import CookieBanner from "@/components/shell/CookieBanner";
import Footer from "@/components/shell/Footer";
import Header from "@/components/shell/Header";
import ScrollToTop from "@/components/shell/ScrollToTop";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Solutions Company | Techversant Infotech",
  description:
    "Techversant is an AI Solutions Company delivering software development, IT consulting, cybersecurity, cloud, and digital transformation services.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The Latin subset of the variable DM Sans is needed by every page (see styles/fonts.css).
  preload("/fonts/dm-sans-normal-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en-US">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
        <ScrollToTop />
      </body>
    </html>
  );
}
