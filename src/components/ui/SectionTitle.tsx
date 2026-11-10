import { Fragment } from "react";
import { upload } from "@/lib/assets";
import SplitText from "./SplitText";

/** The theme's `tm-ele-section-title` widget (371 uses): arrow + uppercase eyebrow, then a split-text heading. */
export default function SectionTitle({
  eyebrow,
  title,
  align = "left",
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: string;
  align?: "left" | "center";
  as?: "h2" | "h3";
}) {
  return (
    <div className={`stitle stitle-${align}`}>
      <div className="eyebrow eyebrow-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={upload("2025/01/Group-40310.webp")} width={29} height={14} alt="" />
        <span>{eyebrow}</span>
      </div>
      <Tag className="sec-title">
        {/* "|" marks an explicit line break in the heading copy. */}
        {title.split("|").map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            <SplitText text={line} />
          </Fragment>
        ))}
      </Tag>
    </div>
  );
}
