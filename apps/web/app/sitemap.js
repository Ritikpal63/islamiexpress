import { apiFetch } from "@/lib/api";
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const d = await apiFetch("/articles?limit=50");
  const staticRoutes = [
    "",
    "/latest",
    "/epaper",
    "/category/india",
    "/category/world",
    "/category/politics",
    "/category/business",
    "/category/sports",
    "/category/entertainment",
    "/category/technology",
    "/category/health",
    "/category/opinion",
    "/category/fact-check",
  ];
  return [
    ...staticRoutes.map((url) => ({
      url: base + url,
      lastModified: new Date(),
    })),
    ...(d?.data || []).map((a) => ({
      url: `${base}/article/${a.slug}`,
      lastModified: new Date(a.updated_at || a.published_at || Date.now()),
    })),
  ];
}
