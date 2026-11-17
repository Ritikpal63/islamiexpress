import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import NewsCard from "@/components/NewsCard";
import usePageMeta from "@/hooks/usePageMeta";

export default function Latest() {
  usePageMeta({ title: "Latest News" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch("/articles?limit=40").then((result) => {
      if (active) setItems(result?.data || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="container listing-page">
      <div className="page-heading"><span>LIVE UPDATES</span><h1>Latest News</h1></div>
      {loading && <p>Loading latest news…</p>}
      {!loading && !items.length && <div className="empty-state">No published stories are available yet.</div>}
      <div className="latest-list">
        {items.map((article) => <NewsCard article={article} variant="horizontal" key={article.id || article.slug} />)}
      </div>
    </div>
  );
}
