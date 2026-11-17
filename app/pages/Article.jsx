import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
import { apiFetch, clientApi } from "@/lib/api";
import EngagementBar from "@/components/EngagementBar";
import Comments from "@/components/Comments";
import NewsCard from "@/components/NewsCard";
import AdSlot from "@/components/AdSlot";
import ProfileAvatar from "@/components/ProfileAvatar";
import formatArticleBody from "@/lib/formatArticleBody";
import usePageMeta from "@/hooks/usePageMeta";

export default function Article() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewedArticleId = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setArticle(null);
    apiFetch(`/articles/${slug}`).then((result) => {
      if (active) setArticle(result?.data || null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!article?.id || viewedArticleId.current === article.id) return;
    viewedArticleId.current = article.id;
    let viewerId = window.localStorage.getItem("ie_article_viewer_id");
    if (!viewerId) {
      viewerId = window.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem("ie_article_viewer_id", viewerId);
    }
    clientApi(`/interactions/${article.id}/view`, {
      method: "POST",
      body: JSON.stringify({
        session_key: viewerId,
        referrer: document.referrer || null,
      }),
    }).then((result) => {
      if (result?.view_count != null) {
        setArticle((current) => current?.id === article.id
          ? { ...current, view_count: result.view_count }
          : current);
      }
    }).catch(() => {});
  }, [article?.id]);

  usePageMeta({
    title: article?.seo_title || article?.title,
    description: article?.seo_description || article?.summary,
    image: article?.featured_image,
  });

  if (loading) return <div className="container article-layout"><p>Loading article…</p></div>;
  if (!article) return <div className="container trust-page"><div className="empty-state">Article not found.</div></div>;

  const published = article.published_at
    ? new Date(article.published_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": article.news_type === "opinion" ? "Article" : "NewsArticle",
    headline: article.title,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    image: article.featured_image ? [article.featured_image] : undefined,
    author: { "@type": "Person", name: article.author_name },
    publisher: { "@type": "Organization", name: "Islami Express" },
  };

  return (
    <div className="container article-layout">
      <article className="article-main">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <div className="breadcrumbs">
          <Link to="/">Home</Link> / <Link to={`/category/${article.category_slug || "latest"}`}>{article.category_name || "Latest"}</Link>
        </div>
        <span className={`story-type ${article.news_type === "breaking" ? "red" : ""}`}>{(article.news_type || "news").replace("_", " ")}</span>
        <h2 style={{ fontSize: "3.5rem" }}>{article.title}</h2>
        {article.summary && <p className="standfirst">{article.summary}</p>}
        <div className="byline">
          <ProfileAvatar name={article.author_name || "Islami Express Desk"} imageUrl={article.author_avatar} />
          <div>
            <b>{article.author_id ? <Link to={`/author/${article.author_id}`}>{article.author_name || "Islami Express Desk"}</Link> : article.author_name || "Islami Express Desk"}</b>
            {published && <span><Clock /> Published {published}</span>}
            {article.location && <span><MapPin /> {article.location}</span>}
          </div>
        </div>
        <EngagementBar article={article} />
        <AdSlot position="ARTICLE_TOP" style={{ width: "820px" }} />
        {article.featured_image && (
          <figure className="article-figure">
            <div><img src={article.featured_image} alt={article.title} /></div>
            {(article.image_caption || article.image_credit) && (
              <figcaption>{article.image_caption} {article.image_credit && <em>• {article.image_credit}</em>}</figcaption>
            )}
          </figure>
        )}
        <div className="article-body" dangerouslySetInnerHTML={{ __html: formatArticleBody(article.body || "") }} />
        <AdSlot position="ARTICLE_MIDDLE" style={{ width: "820px" }} />
        {article.correction_note && <aside className="correction"><b>Correction / Update</b><p>{article.correction_note}</p></aside>}
        {(article.author_name || article.author_bio) && (
          <div className="author-box">
            <ProfileAvatar className="large" name={article.author_name || "Islami Express Desk"} imageUrl={article.author_avatar} />
            <div><small>ABOUT THE AUTHOR</small><h3>{article.author_name || "Islami Express Desk"}</h3>{article.author_bio && <p>{article.author_bio}</p>}</div>
          </div>
        )}
        <Comments articleId={article.id} enabled={article.allow_comments} />
        <AdSlot position="ARTICLE_BOTTOM" style={{ width: "820px" }} />
        {article.related?.length > 0 && (
          <section className="related">
            <div className="section-title"><h2>Related News</h2></div>
            <div className="card-grid two">{article.related.map((related) => <NewsCard article={related} key={related.id || related.slug} />)}</div>
          </section>
        )}
      </article>
      <aside className="article-sidebar">
        <AdSlot position="ARTICLE_SIDEBAR_TOP" fallbackPosition="SIDEBAR_TOP" style={{ width: "320px" }} />
        <div className="story-stats">
          <h3>Story Activity</h3>
          <span><b>{article.view_count || 0}</b> Views</span>
          <span><b>{article.like_count || 0}</b> Likes</span>
          <span><b>{article.comment_count || 0}</b> Comments</span>
          <span><b>{article.share_count || 0}</b> Shares</span>
        </div>
        <AdSlot position="ARTICLE_SIDEBAR_BOTTOM" style={{ width: "320px" }} />
      </aside>
    </div>
  );
}
