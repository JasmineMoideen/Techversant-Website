import SectionTitle from "@/components/ui/SectionTitle";
import { upload } from "@/lib/assets";

const items = [
  { title: ["Highest Quality", "Services"], text: ["Delivering top-tier IT services", "backed by 16 years of expertise."] },
  { title: ["Perfect Business", "Solution"], text: ["Customized solutions that fit", "your business like a glove."] },
  { title: ["Commitment to", "Deliver"], text: ["Driven by dedication, we deliver", "on every promise - always."] },
];

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 448 512" width="22" height="22">
    <path
      fill="#fff"
      d="M313.941 216H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h301.941v46.059c0 21.382 25.851 32.09 40.971 16.971l86.059-86.059c9.373-9.373 9.373-24.569 0-33.941l-86.059-86.059c-15.119-15.119-40.971-4.411-40.971 16.971V216z"
    />
  </svg>
);

/** Home: "Who we are — Driving innovation, together". */
export default function WhoWeAre() {
  return (
    <section className="who">
      <div className="who-row">
        <div className="who-left">
          <SectionTitle eyebrow="Who we are" title="Driving innovation, together" />
          <div className="who-body">
            <div
              className="who-img"
              role="img"
              aria-label="Human and robot hands reaching toward each other"
              style={
                {
                  "--img": `url(${upload("2025/09/Techversant-Landing-AI-Image-550x550.webp")})`,
                  "--img-m": `url(${upload("2025/09/Techversant-Landing-AI-Image.webp")})`,
                } as React.CSSProperties
              }
            />
            <ul className="who-list">
              {items.map((it) => (
                <li key={it.title[0]}>
                  <div className="ib">
                    <span className="ib-icon">
                      <Arrow />
                    </span>
                    <p className="ib-title">
                      {it.title[0]}
                      <br />
                      {it.title[1]}
                    </p>
                  </div>
                  <p className="ib-text">
                    {it.text[0]}
                    <br />
                    {it.text[1]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="who-right" style={{ backgroundImage: `url(${upload("2026/10/Landing-Page-Square-Image-1.webp")})` }} role="img" aria-label="Techversant team and office" />
      </div>
    </section>
  );
}
