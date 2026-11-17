export function safeReturnPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  const url = new URL(value, "https://news.invalid");
  return url.origin === "https://news.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
}

export function getStoredToken() {
  try {
    // Remove tokens left by older releases; authentication now uses an HttpOnly cookie.
    localStorage.removeItem("ie_token");
  } catch {
  }
  return null;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("ie_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(token, user) {
  try {
    localStorage.removeItem("ie_token");
    if (user) localStorage.setItem("ie_user", JSON.stringify(user));
  } catch {}
}

export function clearLegacySession() {
  try {
    localStorage.removeItem("ie_token");
    localStorage.removeItem("ie_user");
  } catch {}
}
