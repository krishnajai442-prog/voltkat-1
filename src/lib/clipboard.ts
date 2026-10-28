/**
 * Copy text from ANY origin. `navigator.clipboard` only exists in secure contexts
 * (https://, localhost, 127.0.0.1); on a LAN IP over http:// it is `undefined`, so a
 * bare `navigator.clipboard.writeText(...)` throws and naive try/catch swallows it.
 * This tries the modern API, then falls back to the legacy execCommand path, which
 * works on insecure origins with no permissions, no prompt, and no dependencies.
 * Resolves true only if the text actually reached the clipboard.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  if (navigator.clipboard && window.isSecureContext !== false) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* permission denied / transient: fall through to legacy */
    }
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.setAttribute("aria-hidden", "true");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.left = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { ta.setSelectionRange(0, text.length); } catch { /* select() already covers iOS */ }

  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}