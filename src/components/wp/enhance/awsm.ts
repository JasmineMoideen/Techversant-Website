/**
 * WP Job Openings (AWSM) listing. The live plugin script (1) turns every `<select class="awsm-filter-option">` into a
 * "Selectric" dropdown (and a nice-select copy that stays hidden), (2) re-queries the server when a filter or the
 * search changes and replaces the list, (3) appends the next page on "Load more", (4) opens/closes the filter bar
 * on small screens and (5) keeps filters in the URL (`?job-category=python`). This is the same flow; the server is the
 * Phase A stand-in in src/app/api/jobs (Phase B: WordPress `admin-ajax.php`).
 */
const ENDPOINT = "/api/jobs/";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function upgradeSelect(select: HTMLSelectElement): () => void {
  const opts = Array.from(select.options);
  const selectedIdx = Math.max(0, select.selectedIndex);
  const label = opts[selectedIdx]?.textContent ?? "";
  const classes = select.className.split(/\s+/).filter(Boolean);
  const second = classes.find((c) => c !== "awsm-filter-option") ?? "";

  const wrapper = document.createElement("div");
  wrapper.className = `awsm-selectric-wrapper awsm-selectric-awsm-filter-option awsm-selectric-${second}`.trim();
  const hide = document.createElement("div");
  hide.className = "awsm-selectric-hide-select";
  select.parentNode!.insertBefore(wrapper, select);
  hide.appendChild(select);
  wrapper.appendChild(hide);
  select.tabIndex = -1;
  select.style.display = "none";

  const nice = document.createElement("div");
  nice.className = `nice-select ${classes.join(" ")}`;
  nice.tabIndex = 0;
  nice.innerHTML = `<span class="current">${esc(label)}</span><ul class="list">${opts
    .map((o, i) => `<li data-value="${esc(o.value)}" class="option${i === selectedIdx ? " selected" : ""}">${esc(o.textContent ?? "")}</li>`)
    .join("")}</ul>`;
  hide.appendChild(nice);

  const box = document.createElement("div");
  box.className = "awsm-selectric";
  box.innerHTML = `<span class="label">${esc(label)}</span><span class="awsm-selectric-arrow-drop">▾</span>`;
  wrapper.appendChild(box);

  const items = document.createElement("div");
  items.className = "awsm-selectric-items";
  items.tabIndex = -1;
  items.innerHTML = `<div class="awsm-selectric-scroll"><ul>${opts
    .map((o, i) => `<li data-index="${i}" class="${[i === selectedIdx ? "selected" : "", i === opts.length - 1 ? "last" : ""].filter(Boolean).join(" ")}">${esc(o.textContent ?? "")}</li>`)
    .join("")}</ul></div>`;
  wrapper.appendChild(items);

  const input = document.createElement("input");
  input.className = "awsm-selectric-input";
  input.tabIndex = 0;
  wrapper.appendChild(input);

  const close = () => wrapper.classList.remove("awsm-selectric-open");
  const onBox = (e: Event) => {
    e.preventDefault();
    const open = !wrapper.classList.contains("awsm-selectric-open");
    document.querySelectorAll(".awsm-selectric-open").forEach((w) => w.classList.remove("awsm-selectric-open"));
    if (open) wrapper.classList.add("awsm-selectric-open");
  };
  const onItem = (e: Event) => {
    const li = (e.target as HTMLElement).closest("li[data-index]");
    if (!li) return;
    const idx = Number(li.getAttribute("data-index"));
    select.selectedIndex = idx;
    box.querySelector(".label")!.textContent = opts[idx].textContent;
    nice.querySelector(".current")!.textContent = opts[idx].textContent;
    items.querySelectorAll("li").forEach((x, i) => x.classList.toggle("selected", i === idx));
    close();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const onDoc = (e: Event) => {
    if (!wrapper.contains(e.target as Node)) close();
  };
  box.addEventListener("click", onBox);
  items.addEventListener("click", onItem);
  document.addEventListener("click", onDoc);
  return () => {
    box.removeEventListener("click", onBox);
    items.removeEventListener("click", onItem);
    document.removeEventListener("click", onDoc);
  };
}

const LOADING_TEXT = "Loading...";

function wrapOf(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(".awsm-job-wrap") ?? el.closest<HTMLElement>(".elementor-widget-container");
}

/** Query-string deep links (`?job-category=python&jq=lead`), as the plugin writes them with history.replaceState. */
function setUrlParam(key: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  params.delete("paged");
  params.delete("page");
  if (value) params.set(key, value);
  else params.delete(key);
  const qs = params.toString();
  window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
}

function fieldsOf(form: HTMLFormElement): [string, string][] {
  const out: [string, string][] = [];
  form.querySelectorAll<HTMLSelectElement>("select.awsm-filter-option").forEach((s) => out.push([s.name, s.value]));
  return out;
}

function initListing(wrap: HTMLElement): () => void {
  const form = wrap.querySelector<HTMLFormElement>(".awsm-filter-wrap form");
  const list = wrap.querySelector<HTMLElement>(".awsm-job-listings");
  if (!form || !list) return () => {};
  const per = list.getAttribute("data-listings") ?? "10";
  const searchInput = form.querySelector<HTMLInputElement>(".awsm-job-search");
  const searchBtn = form.querySelector<HTMLElement>(".awsm-job-search-btn");
  const closeBtn = form.querySelector<HTMLElement>(".awsm-job-search-close-btn");
  let busy = false;

  const filter = async () => {
    if (busy) return;
    busy = true;
    list.classList.add("awsm-jobs-loading");
    const body = new FormData();
    for (const [k, v] of fieldsOf(form)) body.append(k, v);
    body.append("jq", searchInput?.value ?? "");
    body.append("listings_per_page", per);
    body.append("action", "jobfilter");
    try {
      list.innerHTML = await (await fetch(ENDPOINT, { method: "POST", body })).text();
      if (searchInput) {
        if (searchInput.value.length > 0) {
          searchBtn?.classList.add("awsm-job-hide");
          closeBtn?.classList.remove("awsm-job-hide");
        } else searchBtn?.classList.remove("awsm-job-hide");
      }
    } finally {
      list.classList.remove("awsm-jobs-loading");
      busy = false;
    }
  };

  const search = () => {
    const value = searchInput?.value ?? "";
    list.dataset.search = value;
    if (value.length === 0) form.querySelectorAll(".awsm-job-search-icon-wrapper").forEach((i) => i.classList.add("awsm-job-hide"));
    setUrlParam("jq", value);
    void filter();
  };

  const onChange = (e: Event) => {
    const el = e.target as HTMLSelectElement;
    if (!el.matches?.("select.awsm-filter-option")) return;
    const slug = el.options[el.selectedIndex]?.getAttribute("data-slug") ?? "";
    // the URL key is the taxonomy slug from the field name: awsm_job_spec[job-category] -> "job-category"
    const urlKey = el.name.match(/\[([a-z-]+)\]/)?.[1] ?? "";
    if (urlKey) setUrlParam(urlKey, slug);
    void filter();
  };
  const onSearchClick = () => search();
  const onClose = () => {
    if (searchInput) searchInput.value = "";
    search();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  };
  const onSubmit = (e: Event) => e.preventDefault();

  const onLoadMore = async (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".awsm-jobs-pagination .awsm-load-more-btn");
    if (!btn) return;
    e.preventDefault();
    if (btn.getAttribute("aria-disabled") === "true") return;
    btn.setAttribute("aria-disabled", "true");
    const pagination = btn.closest(".awsm-jobs-pagination");
    const body = new FormData();
    for (const [k, v] of fieldsOf(form)) body.append(k, v);
    body.append("jq", list.dataset.search ?? searchInput?.value ?? "");
    body.append("listings_per_page", per);
    body.append("action", "loadmore");
    body.append("paged", btn.getAttribute("data-page") ?? "1");
    btn.textContent = LOADING_TEXT;
    const html = await (await fetch(ENDPOINT, { method: "POST", body })).text();
    if (html.trim()) {
      pagination?.remove();
      list.insertAdjacentHTML("beforeend", html);
    } else btn.remove();
  };

  form.addEventListener("change", onChange);
  form.addEventListener("submit", onSubmit);
  searchBtn?.addEventListener("click", onSearchClick);
  closeBtn?.addEventListener("click", onClose);
  searchInput?.addEventListener("keypress", onKey);
  list.addEventListener("click", onLoadMore);

  // Deep links: apply ?job-category=slug&… on load (the plugin's PHP renders them pre-selected).
  const params = new URLSearchParams(window.location.search);
  let preset = false;
  form.querySelectorAll<HTMLSelectElement>("select.awsm-filter-option").forEach((sel) => {
    const spec = sel.name.match(/\[([a-z-]+)\]/)?.[1];
    const slug = spec ? params.get(spec) : null;
    if (!slug) return;
    const idx = Array.from(sel.options).findIndex((o) => o.getAttribute("data-slug") === slug);
    if (idx < 1) return;
    sel.selectedIndex = idx;
    const label = sel.options[idx].textContent ?? "";
    const wrapper = sel.closest(".awsm-selectric-wrapper");
    wrapper?.querySelector(".awsm-selectric .label")?.replaceChildren(label);
    wrapper?.querySelector(".nice-select .current")?.replaceChildren(label);
    wrapper?.querySelectorAll(".awsm-selectric-items li").forEach((li, i) => li.classList.toggle("selected", i === idx));
    preset = true;
  });
  const q = params.get("jq");
  if (q && searchInput) {
    searchInput.value = q;
    list.dataset.search = q;
    preset = true;
  }
  if (preset) void filter();

  return () => {
    form.removeEventListener("change", onChange);
    form.removeEventListener("submit", onSubmit);
    searchBtn?.removeEventListener("click", onSearchClick);
    closeBtn?.removeEventListener("click", onClose);
    searchInput?.removeEventListener("keypress", onKey);
    list.removeEventListener("click", onLoadMore);
  };
}

/** Filter bar toggle on small screens (jQuery `slideToggle` of `.awsm-filter-items`). */
function initToggle(root: ParentNode): () => void {
  const onClick = (e: Event) => {
    const toggle = (e.target as HTMLElement).closest<HTMLElement>(".awsm-filter-toggle");
    if (!toggle || !root.contains(toggle)) return;
    e.preventDefault();
    toggle.classList.toggle("awsm-on");
    const on = toggle.classList.contains("awsm-on");
    toggle.setAttribute("aria-pressed", String(on));
    const items = toggle.parentElement?.querySelector<HTMLElement>(".awsm-filter-items");
    if (!items) return;
    if (on) {
      items.style.display = "block";
      const h = items.scrollHeight;
      items.animate([{ height: "0px", overflow: "hidden" }, { height: `${h}px`, overflow: "hidden" }], { duration: 400, easing: "ease" });
    } else {
      const h = items.offsetHeight;
      const anim = items.animate([{ height: `${h}px`, overflow: "hidden" }, { height: "0px", overflow: "hidden" }], { duration: 400, easing: "ease" });
      anim.onfinish = () => {
        items.style.display = "none";
      };
    }
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

/** `.awsm-full-width-search-filter-wrap` is set while the filter items wrap onto several rows. */
function initFullWidthFlag(root: ParentNode): () => void {
  const update = () => {
    root.querySelectorAll<HTMLElement>(".awsm-filter-wrap:not(.awsm-no-search-filter-wrap)").forEach((w) => {
      const items = w.querySelectorAll<HTMLElement>(".awsm-filter-item");
      if (items.length === 0) return;
      const first = items[0].getBoundingClientRect().top + window.scrollY;
      const last = items[items.length - 1].getBoundingClientRect().top + window.scrollY;
      w.classList.toggle("awsm-full-width-search-filter-wrap", first < last);
    });
  };
  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}

export function initAwsm(root: ParentNode): () => void {
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLFormElement>(".awsm-filter-wrap form").forEach((form) => {
    form.querySelectorAll<HTMLSelectElement>("select.awsm-filter-option").forEach((s) => {
      if (s.closest(".awsm-selectric-wrapper")) return;
      cleanups.push(upgradeSelect(s));
    });
    const wrap = wrapOf(form);
    if (wrap) cleanups.push(initListing(wrap));
  });
  if (root.querySelector(".awsm-filter-wrap")) {
    cleanups.push(initToggle(root));
    cleanups.push(initFullWidthFlag(root));
  }
  return () => cleanups.forEach((fn) => fn());
}
