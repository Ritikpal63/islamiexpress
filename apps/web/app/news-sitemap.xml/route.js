import { apiFetch } from "@/lib/api";
const esc = (s) =>
  String(s || "").replace(
    /[<>&'\"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c],
  );
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const d = await apiFetch("/articles?limit=50", { next: { revalidate: 300 } });
  const urls = (d?.data || [])
    .filter(
      (a) =>
        a.published_at &&
        Date.now() - new Date(a.published_at).getTime() <= 48 * 3600 * 1000,
    )
    .map(
      (a) =>
        `<url><loc>${base}/article/${a.slug}</loc><news:news><news:publication><news:name>Islami Express</news:name><news:language>${esc(a.language || "en")}</news:language></news:publication><news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
