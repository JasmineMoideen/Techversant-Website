/**
 * Phase A stub of the WP Job Openings application endpoint (`admin-ajax.php?action=awsm_applicant_form_submission`).
 * It checks the same required fields the live form marks as required and answers with the plugin's JSON shape
 * (`{ success: string[], error: string[] }`); nothing is stored or sent. Phase B proxies this to WordPress.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const data = await request.formData();
  const text = (k: string) => String(data.get(k) ?? "").trim();
  const file = data.get("awsm_file");
  const missing =
    !text("awsm_applicant_name") ||
    !text("awsm_applicant_email") ||
    !text("awsm_applicant_phone") ||
    !text("awsm_applicant_letter") ||
    !(file instanceof File && file.size > 0) ||
    data.get("awsm_form_privacy_policy") !== "yes";
  if (missing) return NextResponse.json({ success: [], error: ["Please fill in all the required fields."] });
  return NextResponse.json({ success: ["Your application has been submitted."], error: [] });
}
