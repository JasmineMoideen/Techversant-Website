import { Fragment } from "react";

/**
 * Renders text the way the live theme's `tm-split-text` headings do: every word is an inline-block and every
 * letter is its own inline-block. That loses kerning, so plain text would never pixel-match. The reveal
 * animation (letters sliding/fading in) is added later as a client enhancement; the markup is the final state.
 */
export default function SplitText({ text }: { text: string }) {
  return (
    <span className="split-line" aria-label={text}>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span aria-hidden="true" style={{ position: "relative", display: "inline-block" }}>
            {[...word].map((ch, j) => (
              <span key={j} style={{ position: "relative", display: "inline-block" }}>
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
