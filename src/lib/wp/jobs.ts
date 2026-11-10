/**
 * Job listing for the WP Job Openings (AWSM) shortcode, server side. On the live site the filter bar and the
 * "Load more" button call `admin-ajax.php` (`action=jobfilter` / `action=loadmore`), which answers with HTML. This
 * module produces the same HTML from the REST snapshot of the 44 jobs, so the client code behaves like the live one.
 * Phase B: replaced by the WordPress endpoint (the markup below is the plugin's own).
 */
import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

type RawJob = {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  job_category?: string[];
  job_type?: string[];
  job_location?: string[];
};

const ROOT = process.cwd();
let jobsCache: RawJob[] | null = null;
let termCache: Record<string, Record<string, string>> | null = null;

/** Newest first — the plugin's default order. */
function allJobs(): RawJob[] {
  jobsCache ??= (JSON.parse(fs.readFileSync(path.join(ROOT, "content/snapshot/raw/jobs.json"), "utf8")).items as RawJob[]).sort((a, b) => (a.date < b.date ? 1 : -1));
  return jobsCache;
}

/** Filter-bar term ids (`<option value>`) -> term names, read from the filter markup of the Talent Acquisition page. */
function termNames(): Record<string, Record<string, string>> {
  if (termCache) return termCache;
  const $ = cheerio.load(fs.readFileSync(path.join(ROOT, "content/snapshot/html/talent-acquisition.html"), "utf8"));
  const out: Record<string, Record<string, string>> = {};
  $("select.awsm-filter-option").each((_, el) => {
    const spec = ($(el).attr("name") ?? "").match(/\[([a-z-]+)\]/)?.[1];
    if (!spec) return;
    out[spec] = {};
    $(el)
      .find("option")
      .each((__, o) => {
        const v = $(o).attr("value");
        if (v) out[spec][v] = $(o).text().trim();
      });
  });
  return (termCache = out);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&#8211;/g, "–").replace(/&amp;/g, "&").toLowerCase();

const specHtml = (cls: string, icon: string, terms: string[] | undefined) =>
  terms && terms.length
    ? `<div class="awsm-job-specification-item awsm-job-specification-${cls}"><i class="${icon}"></i>${terms.map((t) => `<span class="awsm-job-specification-term">${esc(t)}</span>`).join(" ")}</div>`
    : "";

function itemHtml(job: RawJob): string {
  const link = job.link.replace(/^https?:\/\/[^/]+/, "");
  const specs = specHtml("job-category", "awsm-job-icon-code", job.job_category) + specHtml("job-location", "awsm-job-icon-location-arrow", job.job_location);
  return `<div class="awsm-job-listing-item awsm-grid-item" id="awsm-grid-item-${job.id}"> <a href="${link}" class="awsm-job-item"><div class="awsm-grid-left-col"><h2 class="awsm-job-post-title"> ${job.title.rendered}</h2></div><div class="awsm-grid-right-col"><div class="awsm-job-specification-wrapper">${specs}</div><div class="awsm-job-more-container"><span class="awsm-job-more">More Details <span></span></span></div></div> </a></div>`;
}

export type JobQuery = { q?: string; category?: string; type?: string; location?: string; per?: number; page?: number };

/** HTML for one page of results (and the "Load more" control when more pages follow); `page` is 1-based. */
export function jobsHtml({ q = "", category, type, location, per = 10, page = 1 }: JobQuery, withEmptyNotice: boolean): string {
  const names = termNames();
  const wanted: [keyof RawJob, string][] = [];
  if (category && names["job-category"]?.[category]) wanted.push(["job_category", names["job-category"][category]]);
  if (type && names["job-type"]?.[type]) wanted.push(["job_type", names["job-type"][type]]);
  if (location && names["job-location"]?.[location]) wanted.push(["job_location", names["job-location"][location]]);
  const needle = q.trim().toLowerCase();
  const hits = allJobs().filter(
    (j) => wanted.every(([key, name]) => ((j[key] as string[] | undefined) ?? []).includes(name)) && (!needle || plain(j.title.rendered + " " + j.content.rendered).includes(needle)),
  );
  const slice = hits.slice((page - 1) * per, page * per);
  if (slice.length === 0) return withEmptyNotice ? `<div class="awsm-jobs-none-container"><p>Sorry! No jobs to show.</p></div>` : "";
  const more = hits.length > page * per ? `<div class="awsm-jobs-pagination awsm-load-more-main"><a href="#" class="awsm-load-more awsm-load-more-btn" data-page="${page}">Load more</a></div>` : "";
  return slice.map(itemHtml).join("") + more;
}
