"use client";

import { useState, useSyncExternalStore } from "react";

const KEY = "cookieConsent";

/**
 * Cookie consent bar + settings panel. Markup and styles come from the live site (#cookie-banner,
 * #cookie-settings); the live site stores the choice in localStorage under the same key. Phase B will wire this
 * to the real consent/analytics setup.
 */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
/** Banner is shown until a choice is stored; storage that throws (private mode) counts as "no choice yet". */
const getSnapshot = () => {
  try {
    return !localStorage.getItem(KEY);
  } catch {
    return true;
  }
};

export default function CookieBanner() {
  // Server render + hydration show nothing; the client snapshot then decides (no setState in an effect).
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const choose = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable */
    }
    setSettingsOpen(false);
    listeners.forEach((l) => l());
  };

  if (!visible) return null;
  return (
    <>
      <div id="cookie-banner" role="dialog" aria-label="Cookie consent">
        🍪 This website uses cookies to ensure you get the best experience. By continuing, you agree to our policy.
        <div>
          <button type="button" className="btn-accept" onClick={() => choose("accepted")}>
            Accept
          </button>{" "}
          <button type="button" className="btn-reject" onClick={() => choose("rejected")}>
            Reject
          </button>{" "}
          <button type="button" className="btn-settings" id="open-settings" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </div>
      {settingsOpen && (
        <div id="cookie-settings" role="dialog" aria-label="Cookie settings">
          <h3>Cookie Settings</h3>
          <p>Manage how cookies are used on this website.</p>
          <div className="cookie-box">
            Necessary Cookies <span className="badge">Always Active</span>
          </div>
          <button type="button" className="close-btn" onClick={() => choose("accepted")}>
            Accept All
          </button>
          <button type="button" className="close-btn" style={{ marginTop: 8, background: "#555" }} onClick={() => choose("rejected")}>
            Necessary Only
          </button>
        </div>
      )}
    </>
  );
}
