import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import NewsCard from "@/components/NewsCard";
import AdSlot from "@/components/AdSlot";
import usePageMeta from "@/hooks/usePageMeta";

export default function Category() {
  const { slug } = useParams();
  const title = useMemo(() => slug.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()), [slug]);
  usePageMeta({ title: `${title} News` });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setItems([]);
    apiFetch(`/articles?category=${encodeURIComponent(slug)}&limit=30`).then((result) => {
      if (active) setItems(result?.data || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  return (
    <div className="container listing-page">
      <div className="page-heading"><span>SECTION</span><h1>{title}</h1></div>
      <AdSlot position="CATEGORY_TOP" style={{ width: "1270px" }} />
      <div className="listing-grid">
        {loading && <p>Loading stories…</p>}
        {!loading && !items.length && <p>No published stories in this category yet.</p>}
        {items.map((article) => <NewsCard article={article} key={article.id || article.slug} />)}
      </div>
    </div>
  );
}
