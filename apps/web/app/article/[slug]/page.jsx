import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { demoArticles, fallbackImage, fallbackImage2 } from "@/lib/mock";
import EngagementBar from "@/components/EngagementBar";
import Comments from "@/components/Comments";
import NewsCard from "@/components/NewsCard";
import AdSlot from "@/components/AdSlot";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
async function getArticle(slug) {
  const d = await apiFetch(`/articles/${slug}`, { next: { revalidate: 60 } });
  if (d?.data) return d.data;
  const demo = process.env.NODE_ENV === "development" && demoArticles.find((x) => x.slug === slug);
  if (!demo) notFound();
  return {
    ...demo,
    body: `<p>${demo.summary}</p><p>Islami Express is designed to publish verified daily reporting with a clear distinction between news, opinion and sponsored material. This demonstration article shows the production article layout.</p><h2>A newsroom built for fast, responsible publishing</h2><p>Reporters can prepare stories, editors can review and correct them, and the publishing system can place important coverage across the home page, category pages, search, RSS feeds and the e-paper archive.</p><p>Readers can like stories, save them for later, share them and participate in moderated discussions.</p>`,
    related: demoArticles.slice(1, 5),
    allow_comments: false,
    view_count: 3182,
    like_count: 124,
    comment_count: 18,
    share_count: 36,
    author_bio: "Reporting and editorial team at Islami Express.",
  };
}
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  return {
    title: a.seo_title || a.title,
    description: a.seo_description || a.summary,
    openGraph: {
      title: a.title,
      description: a.summary,
      images: a.featured_image ? [a.featured_image] : [],
    },
    alternates: a.canonical_url ? { canonical: a.canonical_url } : undefined,
  };
}
export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  const published = a.published_at
    ? new Date(a.published_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": a.news_type === "opinion" ? "Article" : "NewsArticle",
    headline: a.title,
    datePublished: a.published_at,
    dateModified: a.updated_at || a.published_at,
    image: a.featured_image ? [a.featured_image] : undefined,
    author: { "@type": "Person", name: a.author_name },
    publisher: { "@type": "Organization", name: "Islami Express" },
  };
  return (
    <div className="container article-layout">
      <article className="article-main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <div className="breadcrumbs">
          <Link href="/">Home</Link> /{" "}
          <Link href={`/category/${a.category_slug || "latest"}`}>
            {a.category_name || "Latest"}
          </Link>
        </div>
        <span
          className={`story-type ${a.news_type === "breaking" ? "red" : ""}`}
        >
          {(a.news_type || "news").replace("_", " ")}
        </span>
        <h2 style={{ fontSize: "3.5rem" }}>{a.title}</h2 >
        {a.summary && <p className="standfirst">{a.summary}</p>}
        <div className="byline">
          <div className="avatar">{a.author_name?.[0] || "I"}</div>
          <div>
            <b>
              {a.author_id ? (
                <Link href={`/author/${a.author_id}`}>
                  {a.author_name || "Islami Express Desk"}
                </Link>
              ) : (
                a.author_name || "Islami Express Desk"
              )}
            </b>
            <span>
              <Clock /> Published {published}
            </span>
            {a.location && (
              <span>
                <MapPin /> {a.location}
              </span>
            )}
          </div>
        </div>
        <EngagementBar article={a} />
        <AdSlot
          compact
          size="300 × 250"
          image="/assets/ads/4.jpeg"
          style={{ width: "820px", height: "240px" }}
        />
        <figure className="article-figure">
          <div>
            <Image
              src={a.featured_image || fallbackImage2 || fallbackImage}
              alt={a.title}
              fill
              priority
              sizes="(max-width:900px) 100vw, 760px"
            />
          </div>
          {(a.image_caption || a.image_credit) && (
            <figcaption>
              {a.image_caption} {a.image_credit && <em>• {a.image_credit}</em>}
            </figcaption>
          )}
        </figure>
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.body || "") }}
        />
        <AdSlot
          compact
          size="300 × 250"
          image="/assets/ads/2.jpeg"
          style={{ width: "820px", height: "250px" }}
        />
        {a.correction_note && (
          <aside className="correction">
            <b>Correction / Update</b>
            <p>{a.correction_note}</p>
          </aside>
        )}
        <div className="author-box">
          <div className="avatar large">{a.author_name?.[0] || "I"}</div>
          <div>
            <small>ABOUT THE AUTHOR</small>
            <h3>{a.author_name || "Islami Express Desk"}</h3>
            <p>{a.author_bio || "Journalist at Islami Express."}</p>
          </div>
        </div>
        <Comments articleId={a.id} enabled={a.allow_comments} />
        {a.related?.length > 0 && (
          <section className="related">
            <div className="section-title">
              <h2>Related News</h2>
            </div>
            <div className="card-grid two">
              {a.related.map((r, i) => (
                <NewsCard article={r} key={r.id || i} />
              ))}
            </div>
          </section>
        )}
      </article>
      <aside className="article-sidebar">
        <AdSlot
          compact
          size="300 × 250"
          image="/assets/ads/banner2.jpeg"
          style={{ width: "320px", height: "260px" }}
        />
        <div className="story-stats">
          <h3>Story Activity</h3>
          <span>
            <b>{a.view_count || 0}</b> Views
          </span>
          <span>
            <b>{a.like_count || 0}</b> Likes
          </span>
          <span>
            <b>{a.comment_count || 0}</b> Comments
          </span>
          <span>
            <b>{a.share_count || 0}</b> Shares
          </span>
        </div>
        <AdSlot
          compact
          size="300 × 250"
          image="/assets/ads/banner1.jpeg"
          style={{ width: "320px", height: "260px" }}
        />
      </aside>
    </div>
  );
}
