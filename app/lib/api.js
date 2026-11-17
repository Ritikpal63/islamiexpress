import { clearLegacySession, getStoredToken, storeSession } from "./auth";

export function getApiUrl() {
  return (import.meta.env?.VITE_API_URL || globalThis.__APP_CONFIG__?.apiUrl || "/api").replace(/\/+$/, "");
}

function makeUrl(path) {
  const base = getApiUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function clientApi(path, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");

  let response;
  try {
    response = await fetch(makeUrl(path), {
      ...options,
      headers,
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    const error = new Error("The news service is unavailable. Please try again shortly.");
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    if (response.status === 401) clearLegacySession();
    const error = new Error(data?.message || "The service could not complete your request. Please try again.");
    error.status = response.status;
    throw error;
  }

  if (["/auth/login", "/auth/register", "/auth/verify-otp"].includes(path) && data.user) {
    storeSession(null, data.user);
  }
  if (path === "/auth/logout") clearLegacySession();

  return data;
}

export async function apiFetch(path, options = {}) {
  try {
    return await clientApi(path, options);
  } catch {
    return null;
  }
}
