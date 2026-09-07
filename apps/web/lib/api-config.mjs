export function getApiUrl() {
  const configured = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const url = new URL(configured || "http://localhost:8000/api");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("API_URL must be an HTTP(S) backend URL ending in /api.");
  }
  if (process.env.VERCEL === "1" && (url.protocol !== "https:" || /^(localhost|127\.|\[::1\])/.test(url.hostname))) {
    throw new Error("Set API_URL to the deployed HTTPS backend URL in Vercel.");
  }
  return url.href.replace(/\/+$/, "");
}
