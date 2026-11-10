"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Status = "init" | "submitting" | "sent" | "invalid" | "failed";
type ApiResponse = {
  status: "mail_sent" | "validation_failed" | "mail_failed" | "spam" | "aborted";
  message: string;
  invalid_fields?: { field: string; message: string }[];
};

const ENDPOINT = "/api/forms/contact/";

/**
 * Contact form UI (Contact Form 7, form id 110751 on the live site). The submit flow and its visible states mirror
 * CF7: status classes on the form (`init`/`submitting`/`sent`/`invalid`/`failed`), a `.wpcf7-not-valid-tip` under
 * each invalid field and the `.wpcf7-response-output` box. Phase A posts to a local stub with CF7's JSON shape;
 * Phase B proxies it to /wp-json/contact-form-7/v1/contact-forms/110751/feedback.
 */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>("init");
  // The site's custom script relabels the button: "Sending..." while the request is out, "Submit" afterwards.
  const [label, setLabel] = useState("Connect With Us");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("submitting");
    setLabel("Sending...");
    setErrors({});
    try {
      const res = (await (await fetch(ENDPOINT, { method: "POST", body: new FormData(form) })).json()) as ApiResponse;
      if (res.status === "validation_failed") {
        const next: Record<string, string> = {};
        for (const f of res.invalid_fields ?? []) next[f.field] = f.message;
        setErrors(next);
        setStatus("invalid");
      } else if (res.status === "mail_sent") {
        form.reset();
        setStatus("sent");
      } else {
        setStatus("failed");
      }
      setMessage(res.message);
      setLabel("Submit");
    } catch {
      setLabel("Submit");
      setStatus("failed");
      setMessage("There was an error trying to send your message. Please try again later.");
    }
  };

  const field = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    className: errors[name] ? "wpcf7-not-valid" : undefined,
  });
  const tip = (name: string) => (errors[name] ? <span className="wpcf7-not-valid-tip" aria-hidden="true">{errors[name]}</span> : null);

  return (
    <form className={`cf ${status}`} data-status={status} onSubmit={onSubmit} noValidate aria-label="Contact form">
      <div className="cf-row">
        <span className="wpcf7-form-control-wrap" data-name="your-name">
          <label className="sr-only" htmlFor="your-name">
            Your Name
          </label>
          <input id="your-name" name="your-name" type="text" placeholder="Your Name" autoComplete="name" {...field("your-name")} />
          {tip("your-name")}
        </span>
        <span className="wpcf7-form-control-wrap" data-name="tel">
          <label className="sr-only" htmlFor="tel">
            Phone
          </label>
          <input id="tel" name="tel" type="tel" placeholder="Enter Phone" autoComplete="tel" {...field("tel")} />
          {tip("tel")}
        </span>
      </div>
      <span className="wpcf7-form-control-wrap" data-name="your-email">
        <label className="sr-only" htmlFor="your-email">
          Email Address
        </label>
        <input id="your-email" name="your-email" type="email" placeholder="Email Address" autoComplete="email" {...field("your-email")} />
        {tip("your-email")}
      </span>
      <span className="wpcf7-form-control-wrap" data-name="your-message">
        <label className="sr-only" htmlFor="your-message">
          Message
        </label>
        <textarea id="your-message" name="your-message" placeholder="Message" {...field("your-message")} />
        {tip("your-message")}
      </span>
      <span className="wpcf7-form-control-wrap" data-name="terms">
        <label className="cf-terms">
          <input type="checkbox" name="terms" value="1" {...field("terms")} /> <span>I accept the </span>
          <Link href="/dpa/" target="_blank" rel="noopener noreferrer">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy/" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
        </label>
        {tip("terms")}
      </span>
      <input className="cf-submit" type="submit" value={label} disabled={status === "submitting"} />
      {status !== "init" && status !== "submitting" && (
        <div className="wpcf7-response-output" role="alert">
          {message}
        </div>
      )}
    </form>
  );
}
