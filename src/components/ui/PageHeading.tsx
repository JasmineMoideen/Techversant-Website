/**
 * A visually hidden `<h1>` for pages whose design has none (the live site renders 100+ pages without a level-1
 * heading, which hurts screen-reader navigation and SEO). It is clipped to 1px, takes no space and changes no pixel.
 */
const HIDDEN = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** "Page name - Techversant Infotech" -> "Page name". */
export function headingFromTitle(title: string): string {
  return title.replace(/\s*[-–—|]\s*Techversant Infotech.*$/i, "").trim() || title;
}

export default function PageHeading({ title }: { title: string }) {
  return <h1 style={HIDDEN}>{headingFromTitle(title)}</h1>;
}
