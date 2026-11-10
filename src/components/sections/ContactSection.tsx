import CenterTitle from "@/components/ui/CenterTitle";
import { upload } from "@/lib/assets";
import ContactForm from "./ContactForm";

/** "Talk to us" block shown above the footer on ~66 pages (tm-ele-contact-form-7 widget). */
export default function ContactSection() {
  return (
    <section className="contact-sec">
      <div className="contact-title">
        <CenterTitle eyebrow="Talk to us" title="Crafting digital strategies that work" />
      </div>
      <div className="contact-row">
        <div className="contact-img" style={{ backgroundImage: `url(${upload("2025/08/374487294_38fa0762-7f14-4422-a001-95c89030e519.webp")})` }} />
        <ContactForm />
      </div>
    </section>
  );
}
