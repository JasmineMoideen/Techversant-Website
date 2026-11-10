/**
 * Contact Form 7 client behaviour for the server-rendered forms (`form.wpcf7-form`): submit through fetch to the
 * form endpoint, show CF7's validation tips and response output, and keep CF7's status classes
 * (`init` -> `submitting` -> `sent` | `invalid` | `failed`).
 */

const ENDPOINT = "/api/forms/contact/";

type Response = {
  status: "mail_sent" | "validation_failed" | "mail_failed" | "spam" | "aborted";
  message: string;
  invalid_fields?: { field: string; message: string }[];
};

function setStatus(form: HTMLFormElement, status: string) {
  form.setAttribute("data-status", status);
  form.classList.remove("init", "submitting", "sent", "invalid", "unaccepted", "spam", "failed", "aborted", "resetting");
  form.classList.add(status);
  const wrap = form.closest(".wpcf7");
  if (wrap) {
    wrap.classList.remove("no-js");
    wrap.classList.add("js");
  }
}

function clearTips(form: HTMLFormElement) {
  form.querySelectorAll(".wpcf7-not-valid-tip").forEach((el) => el.remove());
  form.querySelectorAll(".wpcf7-not-valid").forEach((el) => {
    el.classList.remove("wpcf7-not-valid");
    el.setAttribute("aria-invalid", "false");
  });
}

function showOutput(form: HTMLFormElement, text: string, status: string) {
  const out = form.querySelector<HTMLElement>(".wpcf7-response-output");
  if (out) {
    out.textContent = text;
    out.removeAttribute("aria-hidden");
    out.setAttribute("role", "alert");
    out.classList.remove("wpcf7-validation-errors", "wpcf7-mail-sent-ok", "wpcf7-mail-sent-ng");
    out.classList.add(status === "sent" ? "wpcf7-mail-sent-ok" : "wpcf7-validation-errors");
  }
  const sr = form.closest(".wpcf7")?.querySelector<HTMLElement>(".screen-reader-response p");
  if (sr) sr.textContent = text;
}

async function submit(form: HTMLFormElement) {
  clearTips(form);
  setStatus(form, "submitting");
  // The site's custom script: the button reads "Sending..." while the request is out, and "Submit" afterwards
  // (whatever the outcome — that is what the live site does).
  const btn = form.querySelector<HTMLInputElement>('input[type="submit"], button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.value = "Sending...";
  }
  const restore = () => {
    if (btn) {
      btn.disabled = false;
      btn.value = "Submit";
    }
  };
  let res: Response;
  try {
    const r = await fetch(ENDPOINT, { method: "POST", body: new FormData(form) });
    res = (await r.json()) as Response;
  } catch {
    restore();
    setStatus(form, "failed");
    showOutput(form, "There was an error trying to send your message. Please try again later.", "failed");
    return;
  }
  restore();
  if (res.status === "validation_failed") {
    setStatus(form, "invalid");
    for (const f of res.invalid_fields ?? []) {
      const wrap = form.querySelector<HTMLElement>(`.wpcf7-form-control-wrap[data-name="${f.field}"]`);
      if (!wrap) continue;
      const control = wrap.querySelector<HTMLElement>(".wpcf7-form-control");
      control?.classList.add("wpcf7-not-valid");
      control?.setAttribute("aria-invalid", "true");
      const tip = document.createElement("span");
      tip.className = "wpcf7-not-valid-tip";
      tip.setAttribute("aria-hidden", "true");
      tip.textContent = f.message;
      wrap.append(tip);
    }
    showOutput(form, res.message, "invalid");
    return;
  }
  if (res.status === "mail_sent") {
    setStatus(form, "sent");
    form.reset();
    showOutput(form, res.message, "sent");
    return;
  }
  setStatus(form, "failed");
  showOutput(form, res.message, "failed");
}

export function initCf7(): () => void {
  const onSubmit = (e: SubmitEvent) => {
    const form = (e.target as Element | null)?.closest<HTMLFormElement>("form.wpcf7-form");
    if (!form) return;
    e.preventDefault();
    void submit(form);
  };
  document.addEventListener("submit", onSubmit);
  return () => document.removeEventListener("submit", onSubmit);
}
