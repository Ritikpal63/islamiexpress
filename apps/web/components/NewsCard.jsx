import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { fallbackImage } from "@/lib/mock";
export default function NewsCard({ article, variant = "default" }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";
  return (
    <article className={`news-card ${variant}`}>
      <Link href={`/article/${article.slug}`} className="card-image">
        <Image
          src={article.featured_image || fallbackImage}
          alt={article.title}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
        />
      </Link>
      <div className="card-body">
        <Link
          className="category-label"
          href={`/category/${article.category_slug || "latest"}`}
        >
          {article.category_name || "Latest"}
        </Link>
        <h3>
          <Link href={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.summary && variant !== "compact" && <p>{article.summary}</p>}
        <div className="meta">
          <span>{date}</span>
          {article.like_count !== undefined && (
            <span>
              <ThumbsUp size={13} />
              {article.like_count}
            </span>
          )}
          {article.comment_count !== undefined && (
            <span>
              <MessageCircle size={13} />
              {article.comment_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
