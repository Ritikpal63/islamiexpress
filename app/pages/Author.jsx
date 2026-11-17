import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import NewsCard from "@/components/NewsCard";
import ProfileAvatar from "@/components/ProfileAvatar";
import usePageMeta from "@/hooks/usePageMeta";

export default function Author() {
  const { id } = useParams();
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/public/authors/${id}`)
      .then((result) => setAuthor(result?.data || null))
      .finally(() => setLoading(false));
  }, [id]);

  usePageMeta({ title: author?.name ? `${author.name} - Author` : "Author" });

  if (loading) return <div className="container trust-page">Loading author…</div>;
  if (!author) return <div className="container trust-page"><div className="empty-state">Author profile not found.</div></div>;

  return (
    <div className="container trust-page">
      <div className="author-profile">
        <ProfileAvatar className="large" name={author.name} imageUrl={author.avatar_url} />
        <div><span>AUTHOR</span><h1>{author.name}</h1>{author.bio && <p>{author.bio}</p>}</div>
      </div>
      <div className="section-title"><h2>Latest stories</h2></div>
      <div className="listing-grid">{(author.articles || []).map((article) => <NewsCard key={article.id} article={article} />)}</div>
    </div>
  );
}
