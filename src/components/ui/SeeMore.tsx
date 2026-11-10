import Link from "next/link";

/** `btn btn-plain-text-with-arrow btn-sm`: circle-arrow glyph (Font Awesome 5 `arrow-alt-circle-right`) + label. */
export default function SeeMore({ href, children = "See More" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link className="see-more" href={href}>
      <svg aria-hidden="true" viewBox="0 0 512 512" width="16" height="16">
        <path
          fill="currentColor"
          d="M256 8c137 0 248 111 248 248S393 504 256 504 8 393 8 256 119 8 256 8zM140 300h116v70.9c0 10.7 13 16.1 20.5 8.5l114.3-114.9c4.7-4.7 4.7-12.2 0-16.9l-114.3-115c-7.6-7.6-20.5-2.2-20.5 8.5V212H140c-6.6 0-12 5.4-12 12v64c0 6.6 5.4 12 12 12z"
        />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
