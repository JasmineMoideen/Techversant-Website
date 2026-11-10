import Link from "next/link";
import { footer } from "@/content/shell";
import { upload } from "@/lib/assets";
import ActiveLink from "./ActiveLink";

const icons: Record<string, string> = {
  Facebook: "M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z",
  X: "M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z",
  YouTube: "M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z",
  LinkedIn: "M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z",
};

export default function Footer() {
  const f = footer;
  return (
    <footer className="site-footer" id="footer">
      <div className="ftr-grid">
        <div className="ftr-col ftr-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={upload("2026/09/techversantlogo.webp")} width={400} height={67} alt="Logo" />
          <p>
            {f.tagline[0]}
            <br />
            {f.tagline[1]}
          </p>
        </div>
        <div className="ftr-col">
          <div className="ftr-title">Services</div>
          <ul className="ftr-links">
            {f.services.map((l) => (
              <li key={l.label}>
                <ActiveLink href={l.href}>{l.label}</ActiveLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="ftr-col">
          <div className="ftr-title">Quick Links</div>
          <ul className="ftr-links">
            {f.quickLinks.map((l) => (
              <li key={l.label}>
                <ActiveLink href={l.href}>{l.label}</ActiveLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="ftr-col">
          <div className="ftr-title">Get in Touch</div>
          <div className="ftr-contact">
            {f.contact.markets}
            <br />
            <a href={`mailto:${f.contact.email}`}>{f.contact.email}</a>
            <br />
            {f.contact.phones}
          </div>
          <div className="ftr-social">
            {f.social.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener" aria-label={s.name} style={{ background: s.bg }}>
                <svg viewBox={s.name === "YouTube" ? "0 0 576 512" : s.name === "LinkedIn" ? "0 0 448 512" : "0 0 512 512"} width="18" height="18" aria-hidden="true">
                  <path fill="#fff" d={icons[s.name]} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="ftr-copy">
        © {f.copyrightYear} <Link href="/">Techversant</Link>. All rights reserved.
      </div>
    </footer>
  );
}
