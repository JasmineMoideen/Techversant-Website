/**
 * WP Job Openings (AWSM) application form on single job pages. The live plugin validates with jQuery Validate
 * (`errorElement: "div"`, `errorClass: "awsm-job-form-error"`, errors appended to the field's `.awsm-job-form-group`,
 * messages taken from the `data-msg-*` attributes), then posts the form through admin-ajax and shows the server's
 * messages in `.awsm-application-message` (`awsm-success-message` / `awsm-error-message`). This is the same flow;
 * the endpoint is the Phase A stub (src/app/api/forms/application) that Phase B replaces with WordPress.
 */
const ENDPOINT = "/api/forms/application/";
const ERROR_CLASS = "awsm-job-form-error";
// jQuery Validate's email rule.
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isEmpty(el: Field): boolean {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    const same = el.form?.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(el.name)}"]`);
    return !Array.from(same ?? [el]).some((c) => c.checked);
  }
  if (el instanceof HTMLInputElement && el.type === "file") return !el.files || el.files.length === 0;
  return el.value.replace(/\r/g, "").length === 0;
}

function messageFor(el: Field): string | null {
  const data = (k: string) => el.getAttribute(`data-msg-${k}`);
  if (el.hasAttribute("required") && isEmpty(el)) return data("required") ?? "This field is required.";
  if (isEmpty(el)) return null;
  if (el.getAttribute("data-rule-email") === "true" && !EMAIL.test(el.value)) return data("email") ?? "Please enter a valid email address.";
  return null;
}

function clearError(el: Field) {
  const group = el.closest(".awsm-job-form-group");
  group?.querySelectorAll(`div.${ERROR_CLASS}`).forEach((d) => d.remove());
  el.classList.remove(ERROR_CLASS);
  el.removeAttribute("aria-invalid");
  el.removeAttribute("aria-describedby");
}

function showError(el: Field, msg: string) {
  clearError(el);
  const group = el.closest(".awsm-job-form-group");
  if (!group) return;
  const id = `${el.id || el.name}-error`;
  const div = document.createElement("div");
  div.id = id;
  div.className = ERROR_CLASS;
  div.textContent = msg;
  group.appendChild(div);
  el.classList.add(ERROR_CLASS);
  el.setAttribute("aria-invalid", "true");
  el.setAttribute("aria-describedby", id);
}

function validateField(el: Field): boolean {
  const msg = messageFor(el);
  if (msg) showError(el, msg);
  else clearError(el);
  return !msg;
}

async function submit(form: HTMLFormElement) {
  const btn = form.querySelector<HTMLInputElement>(".awsm-application-submit-btn");
  const box = form.parentElement?.querySelector<HTMLElement>(".awsm-application-message");
  if (!btn || !box) return;
  const label = btn.value;
  const sending = btn.dataset.responseText ?? "Submitting..";
  box.style.display = "none";
  box.classList.remove("awsm-success-message", "awsm-error-message");
  btn.disabled = true;
  btn.value = sending;
  btn.classList.add("awsm-application-submit-btn-disabled");
  const show = (cls: string, messages: string[]) => {
    box.classList.add(cls);
    box.innerHTML = messages.map((m) => `<p>${m.replace(/</g, "&lt;")}</p>`).join("");
    box.style.display = "block";
  };
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body: new FormData(form) });
    const json = (await res.json()) as { success: string[]; error: string[] };
    if (json.error.length > 0) show("awsm-error-message", json.error);
    else if (json.success.length > 0) {
      form.reset();
      show("awsm-success-message", json.success);
    }
  } catch {
    show("awsm-error-message", ["Error in submitting your application. Please try again later!"]);
  } finally {
    btn.disabled = false;
    btn.value = label;
    btn.classList.remove("awsm-application-submit-btn-disabled");
  }
}

/**
 * The site's custom script for the job form: once an application went through, a cookie (`applied_job_<id>`, 90 days)
 * replaces the form with "You have already applied for this position." — also on later visits.
 */
function initAlreadyApplied(form: HTMLFormElement): () => void {
  const id = form.querySelector<HTMLInputElement>('input[name="awsm_job_id"]')?.value;
  const container = form.parentElement;
  if (!id || !container) return () => {};
  const cookie = `applied_job_${id}`;
  const showMessage = () => {
    form.style.display = "none";
    if (!container.querySelector(".already-applied-message")) {
      const msg = document.createElement("div");
      msg.className = "already-applied-message";
      msg.innerHTML = "<p><strong>You have already applied for this position.</strong></p>";
      container.insertBefore(msg, form);
    }
  };
  if (document.cookie.split("; ").some((r) => r.startsWith(`${cookie}=`))) {
    showMessage();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (container.querySelector(".awsm-success-message")) {
      document.cookie = `${cookie}=true; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
      showMessage();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function initAwsmApplication(root: ParentNode): () => void {
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLFormElement>("form.awsm-application-form").forEach((form) => {
    form.noValidate = true; // jQuery Validate replaces the browser's own bubbles
    cleanups.push(initAlreadyApplied(form));
    const fields = () => Array.from(form.querySelectorAll<Field>(".awsm-job-form-field"));
    let submitted = false;

    const onSubmit = (e: Event) => {
      e.preventDefault();
      submitted = true;
      let ok = true;
      let first: Field | null = null;
      for (const f of fields()) {
        if (!validateField(f)) {
          ok = false;
          first ??= f;
        }
      }
      if (!ok) {
        first?.focus();
        return;
      }
      // Same guard as the plugin: files over the WordPress upload limit are refused client-side.
      const box = form.parentElement?.querySelector<HTMLElement>(".awsm-application-message");
      const tooBig = fields().some((f) => f instanceof HTMLInputElement && f.type === "file" && f.files?.[0] && f.files[0].size > 2147483648);
      if (tooBig && box) {
        box.classList.add("awsm-error-message");
        box.innerHTML = "The file you have selected is too large.";
        box.style.display = "block";
        return;
      }
      void submit(form);
    };
    // jQuery Validate defaults: re-check on focus-out once an error was shown or the form was submitted, on keyup
    // while invalid, and on change for file/checkbox inputs.
    const onFocusOut = (e: Event) => {
      const el = e.target as Field;
      if (!el.classList?.contains("awsm-job-form-field")) return;
      if (submitted || el.classList.contains(ERROR_CLASS)) validateField(el);
    };
    const onKeyUp = (e: Event) => {
      const el = e.target as Field;
      if (el.classList?.contains("awsm-job-form-field") && el.classList.contains(ERROR_CLASS)) validateField(el);
    };
    const onChange = (e: Event) => {
      const el = e.target as Field;
      if (!el.classList?.contains("awsm-job-form-field")) return;
      if ((el instanceof HTMLInputElement && (el.type === "file" || el.type === "checkbox")) || el.classList.contains(ERROR_CLASS)) validateField(el);
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("focusout", onFocusOut);
    form.addEventListener("keyup", onKeyUp);
    form.addEventListener("change", onChange);
    cleanups.push(() => {
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("focusout", onFocusOut);
      form.removeEventListener("keyup", onKeyUp);
      form.removeEventListener("change", onChange);
    });
  });
  return () => cleanups.forEach((fn) => fn());
}
