import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiUrl } from "@/lib/api-config.mjs";

export const dynamic = "force-dynamic";
const cookieName = "ie_session";

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function sessionCookie(response, request, token, maxAge = 7 * 24 * 60 * 60) {
  response.cookies.set(cookieName, token, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: request.nextUrl.protocol === "https:", maxAge,
  });
}

async function proxy(request, context) {
  const { path } = await context.params;
  if (!path?.length || path.some(part => !part || part === "." || part === ".." || /[\\/?#]/.test(part)) ||
      !["auth", "articles", "comments", "interactions", "admin", "public"].includes(path[0])) {
    return json({ message: "Route not found" }, 404);
  }
  const mutation = !["GET", "HEAD"].includes(request.method);
  if (mutation) {
    const origin = request.headers.get("origin");
    // NextURL normalizes loopback hosts; compare against the actual HTTP Host.
    const host = request.headers.get("host") || request.nextUrl.host;
    let sameOrigin = !origin;
    try {
      const source = new URL(origin);
      sameOrigin = source.host === host && source.protocol === request.nextUrl.protocol;
    } catch {}
    if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ message: "Cross-site requests are not allowed" }, 403);
    }
    if (request.headers.get("content-type") && !request.headers.get("content-type").startsWith("application/json")) {
      return json({ message: "JSON request body required" }, 415);
    }
  }
  const endpoint = path.join("/");
  if (endpoint === "auth/logout" && request.method === "POST") {
    const response = json({ success: true });
    sessionCookie(response, request, "", 0);
    return response;
  }
  let base;
  try { base = getApiUrl(); } catch {
    return json({ message: "The backend is not configured. Set API_URL to the deployed API URL." }, 503);
  }
  if (new URL(base).origin === request.nextUrl.origin) {
    return json({ message: "API_URL must point to the Express backend, not this website." }, 503);
  }
  const headers = new Headers({ Accept: "application/json" });
  // Vercel supplies the visitor address; preserve it for upstream rate limiting.
  if (process.env.VERCEL === "1" && request.headers.get("x-forwarded-for")) {
    headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for"));
  }
  const cookie = request.cookies.get(cookieName)?.value;
  const authorization = cookie ? `Bearer ${cookie}` : request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  let body;
  if (mutation) {
    body = await request.text();
    if (Buffer.byteLength(body) > 2 * 1024 * 1024) return json({ message: "Request is too large" }, 413);
    if (body) headers.set("Content-Type", "application/json");
  }
  let upstream, data;
  try {
    upstream = await fetch(`${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, {
      method: request.method, headers, body: body || undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    data = await upstream.json();
  } catch {
    return json({ message: "The news service is unavailable. Please try again shortly." }, 502);
  }
  const login = ["auth/login", "auth/register"].includes(endpoint) && request.method === "POST";
  if (login && upstream.ok && (!data.token || !data.user?.id)) {
    return json({ message: "The login service returned an invalid session." }, 502);
  }
  const response = json(login && upstream.ok ? { success: true, user: data.user } : data, upstream.status);
  if (login && upstream.ok) sessionCookie(response, request, data.token);
  if (upstream.status === 401 && !login) sessionCookie(response, request, "", 0);
  if (upstream.ok && mutation && path[0] === "articles") {
    revalidatePath("/", "layout");
  }
  return response;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
