import Link from "next/link";
import { mainMenu, type MenuItem } from "@/content/shell";
import { upload } from "@/lib/assets";
import MobileMenu from "./MobileMenu";
import StickyHeader from "./StickyHeader";

function SubMenu({ items }: { items: MenuItem[] }) {
  return (
    <ul className="dropdown">
      {items.map((item) => (
        <li key={item.label} className={item.children ? "has-children" : undefined}>
          <Link href={item.href}>{item.label}</Link>
          {item.children && <SubMenu items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

/** Logo + primary navigation + CTA: rendered twice (the page header and its fixed "sticky" copy, like the live theme). */
function HeaderRow({ withMobileMenu }: { withMobileMenu: boolean }) {
  const nav = mainMenu.filter((m) => m.label !== "Contact Us");
  return (
    <div className="hdr-row">
      <div className="hdr-logo">
        <Link href="/" aria-label="Techversant Infotech home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={upload("2026/10/techversantlogo-1.webp")} width={400} height={67} alt="Techversant Infotech" />
        </Link>
      </div>
      <nav className="hdr-nav" aria-label="Primary">
        <ul className="menu">
          {nav.map((item) => (
            <li key={item.label} className={item.children ? "has-children" : undefined}>
              <Link href={item.href}>
                <span>{item.label}</span>
              </Link>
              {item.children && <SubMenu items={item.children} />}
            </li>
          ))}
        </ul>
      </nav>
      <div className="hdr-cta">
        <Link href="/contact-us/" className="btn-cta">
          <span>Contact Us</span>
        </Link>
      </div>
      {withMobileMenu && <MobileMenu items={mainMenu} />}
    </div>
  );
}

/**
 * Live theme behaviour: above 1024px the header scrolls away with the page and a fixed copy slides in once the page
 * is scrolled past it (StickyHeader); at 1024px and below the header is pinned to the top from the start (the
 * `.header-wrap` keeps its space in the flow).
 */
export default function Header() {
  return (
    <>
      <div className="header-wrap">
        <header className="site-header" id="header">
          <HeaderRow withMobileMenu />
        </header>
      </div>
      <StickyHeader>
        <HeaderRow withMobileMenu={false} />
      </StickyHeader>
    </>
  );
}
