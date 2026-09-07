export function safeReturnPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  const url = new URL(value, "https://news.invalid");
  return url.origin === "https://news.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
}

export function clearLegacySession() {
  try {
    localStorage.removeItem("ie_token");
    localStorage.removeItem("ie_user");
  } catch {}
}
