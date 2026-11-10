import { upload } from "@/lib/assets";
import SplitText from "./SplitText";

/** The theme's `tm-ele-section-title` widget in its centred variant (`line-center-current-theme`), optional paragraph. */
export default function CenterTitle({
  eyebrow,
  title,
  text,
  tone = "dark",
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: string;
  text?: string;
  tone?: "dark" | "light";
  as?: "h2" | "h3";
}) {
  return (
    <div className={`stc${tone === "light" ? " stc-light" : ""}`}>
      <div className="stc-sub">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={upload("2025/01/Group-40310.webp")} width={29} height={14} alt="" />
        <span>{eyebrow}</span>
      </div>
      <Tag className="stc-title">
        <SplitText text={title} />
      </Tag>
      {text ? <p className="stc-text">{text}</p> : null}
    </div>
  );
}
