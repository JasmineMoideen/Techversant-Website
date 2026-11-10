/**
 * Phase A stand-in for the plugin's `admin-ajax.php` actions used by the job list: `jobfilter` (filter / search,
 * replaces the list) and `loadmore` (next page, appended). Answers with the same HTML fragments.
 */
import { jobsHtml } from "@/lib/wp/jobs";

export async function POST(request: Request) {
  const f = await request.formData();
  const get = (k: string) => String(f.get(k) ?? "");
  const action = get("action");
  const query = {
    q: get("jq"),
    category: get("awsm_job_spec[job-category]"),
    type: get("awsm_job_spec[job-type]"),
    location: get("awsm_job_spec[job-location]"),
    per: Number(get("listings_per_page")) || 10,
  };
  // `loadmore` sends the page number that was just shown (the button's data-page); the next one is returned.
  const html = action === "loadmore" ? jobsHtml({ ...query, page: (Number(get("paged")) || 1) + 1 }, false) : jobsHtml({ ...query, page: 1 }, true);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
