import { apiFetch } from "@/lib/api";
import { demoArticles } from "@/lib/mock";
import NewsCard from "@/components/NewsCard";
import AdSlot from "@/components/AdSlot";
export async function generateMetadata({ params }) {
  const { slug } = await params;
  return {
    title:
      slug.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) +
      " News",
  };
}
export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const d = await apiFetch(
    `/articles?category=${encodeURIComponent(slug)}&limit=30`,
  );
  const items = d?.data || (process.env.NODE_ENV === "development" ? demoArticles.filter(article => article.category_slug === slug) : []);
  const title = slug
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="container listing-page">
      <div className="page-heading">
        <span>SECTION</span>
        <h1>{title}</h1>
        <p>
          Latest {title.toLowerCase()} news, updates, analysis and explainers
          from Islami Express.
        </p>
      </div>
      <AdSlot
        compact
        size="300 × 250"
        image="/assets/ads/3.jpeg"
        style={{ width: "1270px", height: "250px" }}
      />
      <div className="listing-grid">
        {!items.length && <p>No published stories in this category yet.</p>}
        {items.map((a, i) => (
          <NewsCard article={a} key={a.id || i} />
        ))}
      </div>
    </div>
  );
}
