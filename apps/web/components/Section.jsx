import Link from "next/link";
import NewsCard from "./NewsCard";
export default function Section({ title, slug, articles = [] }) {
  if (!articles.length) return null;
  return (
    <section className="news-section">
      <div className="section-title">
        <h2>{title}</h2>
        <Link href={`/category/${slug}`}>View all →</Link>
      </div>
      <div className="card-grid">
        {articles.slice(0, 4).map((a, i) => (
          <NewsCard key={a.id || i} article={a} />
        ))}
      </div>
    </section>
  );
}
