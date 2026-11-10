"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/** A Link that is marked `data-current` when it points at the current page (the live site colours these cyan). */
export default function ActiveLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : (href.pathname ?? "");
  return <Link href={href} data-current={pathname === target ? "true" : undefined} {...rest} />;
}
