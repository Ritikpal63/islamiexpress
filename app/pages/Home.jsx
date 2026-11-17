import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import BreakingTicker from "@/components/BreakingTicker";
import NewsCard from "@/components/NewsCard";
import Section from "@/components/Section";
import AdSlot from "@/components/AdSlot";
import usePageMeta from "@/hooks/usePageMeta";

export default function Home() {
  usePageMeta();
  const [all, setAll] = useState([]);
  const [breaking, setBreaking] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch("/articles?limit=12"),
      apiFetch("/articles?limit=12&type=breaking"),
      apiFetch("/articles/trending?limit=6"),
    ]).then(([articles, breakingNews, trending]) => {
      if (!active) return;
      setAll(articles?.data || []);
      setBreaking(breakingNews?.data || []);
      setTrend(trending?.data || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const lead = all[0] || null;
  const side = all.slice(1, 5);
  const groups = {
    India: all.filter((x) => x.category_slug === "india"),
    Politics: all.filter((x) => x.category_slug === "politics"),
    Business: all.filter((x) => x.category_slug === "business"),
    Sports: all.filter((x) => x.category_slug === "sports"),
    Entertainment: all.filter((x) => x.category_slug === "entertainment"),
  };

  return (
    <>
      <BreakingTicker items={breaking.slice(0, 5)} />
      <div className="container">
        <AdSlot position="HOME_TOP" style={{ width: "1280px" }} />

        {lead ? (
          <section className="hero-grid">
            <article className="lead-story">
              <Link to={`/article/${lead.slug}`}>
                {lead.featured_image && (
                  <div className="lead-image">
                    <img src={lead.featured_image} alt={lead.title} />
                  </div>
                )}
                <h2>{lead.title}</h2>
                {lead.summary && <p>{lead.summary}</p>}
              </Link>
            </article>
            <div className="side-stories">
              {side.map((article) => (
                <NewsCard article={article} variant="compact" key={article.id || article.slug} />
              ))}
            </div>
            {trend.length > 0 && (
              <aside className="trending-box">
                <div className="trending-title"><TrendingUp /> Trending</div>
                {trend.slice(0, 6).map((article, index) => (
                  <Link key={article.id || article.slug} to={`/article/${article.slug}`}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span>{article.title}</span>
                  </Link>
                ))}
              </aside>
            )}
          </section>
        ) : !loading ? (
          <div className="empty-state">No published stories are available yet.</div>
        ) : (
          <div className="empty-state">Loading latest news…</div>
        )}

        <div className="two-col">
          <div>
            {all.length > 0 && (
              <section className="news-section">
                <div className="section-title">
                  <h2>Latest News</h2>
                  <Link to="/latest">View all →</Link>
                </div>
                <div className="card-grid">
                  {all.slice(0, 4).map((article) => (
                    <NewsCard key={article.id || article.slug} article={article} />
                  ))}
                </div>
              </section>
            )}

            <AdSlot position="HOME_MIDDLE" style={{ width: "930px" }} />
            {groups.India.length > 0 && <Section title="India" slug="india" articles={groups.India} />}
            {groups.Politics.length > 0 && <Section title="Politics" slug="politics" articles={groups.Politics} />}
            <AdSlot position="HOME_LOWER" style={{ width: "920px" }} />
            {groups.Business.length > 0 && <Section title="Business" slug="business" articles={groups.Business} />}
            {groups.Sports.length > 0 && <Section title="Sports" slug="sports" articles={groups.Sports} />}
            {groups.Entertainment.length > 0 && <Section title="Entertainment" slug="entertainment" articles={groups.Entertainment} />}
          </div>

          <aside className="home-sidebar">
            <AdSlot position="HOME_SIDEBAR_TOP" fallbackPosition="SIDEBAR_TOP" style={{ width: "320px" }} />
            {all.length > 0 && (
              <div className="editors-pick">
                <h3>Editor’s Picks</h3>
                {all.slice(0, 5).map((article, index) => (
                  <Link to={`/article/${article.slug}`} key={article.id || article.slug}>
                    <span>{index + 1}</span>
                    {article.title}
                    <ChevronRight />
                  </Link>
                ))}
              </div>
            )}
            <AdSlot position="HOME_SIDEBAR_BOTTOM" style={{ width: "320px" }} />
          </aside>
        </div>
      </div>
    </>
  );
}
