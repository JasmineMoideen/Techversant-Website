/**
 * Phase A stub of Contact Form 7's REST endpoint (`/wp-json/contact-form-7/v1/contact-forms/<id>/feedback`).
 * It validates like the live form (required name / phone / email / message / terms) and answers with the same JSON
 * shape, so the client code does not change when Phase B proxies this to WordPress.
 */
import { NextResponse } from "next/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const data = await request.formData();
  const get = (k: string) => String(data.get(k) ?? "").trim();
  const invalid: { field: string; message: string; error_id: string }[] = [];
  const need = (field: string, ok: boolean, message = "Please fill out this field.") => {
    if (!ok) invalid.push({ field, message, error_id: `-ve-${field}` });
  };
  need("your-name", get("your-name").length > 0);
  need("tel", get("tel").length > 0);
  if (get("tel")) need("tel", get("tel").length >= 7 && get("tel").length <= 15, "Please enter a telephone number.");
  need("your-email", get("your-email").length > 0);
  if (get("your-email")) need("your-email", EMAIL.test(get("your-email")), "Please enter an email address.");
  need("your-message", get("your-message").length > 0);
  need("terms", data.get("terms") !== null, "You must accept the terms and conditions before sending your message.");

  const base = { contact_form_id: Number(get("_wpcf7") || 110751), posted_data_hash: "" };
  if (invalid.length) {
    return NextResponse.json({ ...base, status: "validation_failed", message: "One or more fields have an error. Please check and try again.", invalid_fields: invalid }, { status: 200 });
  }
  // Phase A: nothing is sent anywhere.
  return NextResponse.json({ ...base, status: "mail_sent", message: "Thank you for your message. It has been sent." });
}
