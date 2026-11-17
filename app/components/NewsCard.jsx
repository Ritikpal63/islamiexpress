import { Link } from "react-router-dom";
import { MessageCircle, ThumbsUp } from "lucide-react";

export default function NewsCard({ article, variant = "default" }) {
  if (!article?.slug || !article?.title) return null;
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <article className={`news-card ${variant}`}>
      {article.featured_image && (
        <Link to={`/article/${article.slug}`} className="card-image">
          <img src={article.featured_image} alt={article.title} loading="lazy" decoding="async" />
        </Link>
      )}
      <div className="card-body">
        {(article.category_name || article.category_slug) && (
          <Link className="category-label" to={`/category/${article.category_slug || "latest"}`}>
            {article.category_name || article.category_slug}
          </Link>
        )}
        <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
        {article.summary && variant !== "compact" && <p>{article.summary}</p>}
        <div className="meta">
          {date && <span>{date}</span>}
          {article.like_count !== undefined && <span><ThumbsUp size={13}/>{article.like_count}</span>}
          {article.comment_count !== undefined && <span><MessageCircle size={13}/>{article.comment_count}</span>}
        </div>
      </div>
    </article>
  );
}
