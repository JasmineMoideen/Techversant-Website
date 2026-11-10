"use client";

import Link from "next/link";
import { useState } from "react";
import type { MenuItem } from "@/content/shell";
import { upload } from "@/lib/assets";

function Row({ item, close, depth = 0 }: { item: MenuItem; close: () => void; depth?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`m-item depth-${depth}${open ? " is-open" : ""}${item.label === "Contact Us" ? " m-contact" : ""}`}>
      <div className="m-row">
        <Link href={item.href} onClick={item.children ? undefined : close}>
          {item.label}
        </Link>
        {item.children && (
          <button type="button" className="m-toggle" aria-expanded={open} aria-label={`Toggle ${item.label}`} onClick={() => setOpen((v) => !v)} />
        )}
      </div>
      {item.children && open && (
        <ul className="m-sub">
          {item.children.map((c) => (
            <Row key={c.label} item={c} close={close} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Hamburger (visible <= 1024px) + off-canvas drawer. */
export default function MobileMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className="hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <span />
      </button>
      <div className={`m-overlay${open ? " is-open" : ""}`} onClick={close} aria-hidden={!open} />
      <aside className={`m-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <button type="button" className="m-close" aria-label="Close menu" onClick={close} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="m-logo" src={upload("2026/10/techversantlogo-1.webp")} width={400} height={67} alt="Techversant Infotech" />
        <ul className="m-list">
          {items.map((item) => (
            <Row key={item.label} item={item} close={close} />
          ))}
        </ul>
      </aside>
    </>
  );
}
