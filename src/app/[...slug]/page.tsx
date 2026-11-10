import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WpPage from "@/components/wp/WpPage";
import { buildMetadata } from "@/lib/wp/metadata";
import { getPageDoc, listRoutes } from "@/lib/wp/snapshot";

// Content is fully known at build time (generateStaticParams), so a blocking route is fine.
export const instant = false;

const toRoute = (slug: string[]) => `/${slug.join("/")}/`;

export function generateStaticParams() {
  return listRoutes()
    .filter((r) => r !== "/" && r !== "/404/")
    .map((r) => ({ slug: r.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const doc = getPageDoc(toRoute(slug));
  return doc ? buildMetadata(doc) : {};
}

export default async function WpRoute({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const route = toRoute(slug);
  const doc = route === "/404/" ? null : getPageDoc(route);
  if (!doc) notFound();
  return <WpPage doc={doc} />;
}
