import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "@/hooks/usePageMeta";
import { clientApi } from "@/lib/api";
import {
  FileText,
  Users,
  MessageSquare,
  Eye,
  ThumbsUp,
  Share2,
  Bookmark,
} from "lucide-react";
export default function Admin() {
  usePageMeta({ title: "Editorial Dashboard" });
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    clientApi("/auth/me")
      .then(async (session) => {
        setUser(session.data);
        if (session.data?.role === "reporter") {
          const result = await clientApi("/admin/articles");
          const articles = result.data || [];
          setData({
            reporter: true,
            total: articles.length,
            review: articles.filter((article) => article.status === "review").length,
            published: articles.filter((article) => article.status === "published").length,
            drafts: articles.filter((article) => article.status === "draft").length,
          });
          return;
        }
        const d = await clientApi("/admin/dashboard");
        setData(d.data);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="container admin-page">
        <div className="empty-state">
          <h2>CMS access required</h2>
          <p>
            {error}. Sign in with an account that has newsroom access.
          </p>
        </div>
      </div>
    );
  if (!data)
    return <div className="container admin-page">Loading dashboard…</div>;
  if (data.reporter) {
    return (
      <div className="container admin-page">
        <div className="page-heading">
          <span>REPORTER WORKSPACE</span>
          <h1>My submissions</h1>
          <p>Submit a story for editorial review and track its status.</p>
          <div className="admin-dashboard-links"><Link to="/admin/articles">Write or manage my news</Link></div>
        </div>
        <div className="stat-grid">
          {[["My submissions", data.total], ["In review", data.review], ["Published", data.published], ["Drafts", data.drafts]].map(([label, value]) => (
            <div className="stat-card" key={label}><FileText /><span>{label}</span><b>{Number(value || 0).toLocaleString("en-IN")}</b></div>
          ))}
        </div>
      </div>
    );
  }
  const cards = [
    [FileText, "Published", data.articles.published],
    [Users, "Readers", data.readers.total],
    [MessageSquare, "Pending comments", data.comments.pending],
    [Eye, "Views today", data.today_views],
    [ThumbsUp, "Likes today", data.engagement.likes],
    [Share2, "Shares today", data.engagement.shares],
    [Bookmark, "Saves today", data.engagement.saves],
  ];
  return (
    <div className="container admin-page">
      <div className="page-heading">
        <span>NEWSROOM CMS</span>
        <h1>{user?.role === "super_admin" ? "Super Admin Dashboard" : user?.role === "admin" ? "Admin Dashboard" : "Editor Dashboard"}</h1>
        <p>Publishing and reader engagement overview.</p>
        <div className="admin-dashboard-links">
          <Link to="/admin/articles">Manage news</Link>
          <Link to="/admin/categories">Manage categories</Link>
          <Link to="/admin/comments">Moderate comments</Link>
          {user?.role !== "editor" && <Link to="/admin/ads">Manage advertisements</Link>}
          {(user?.role === "admin" || user?.role === "super_admin") && <Link to="/admin/users">Manage users</Link>}
        </div>
      </div>
      <div className="stat-grid">
        {cards.map(([Icon, n, v]) => (
          <div className="stat-card" key={n}>
            <Icon />
            <span>{n}</span>
            <b>{Number(v || 0).toLocaleString("en-IN")}</b>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Top stories today</h2>
        {data.top.map((x, i) => (
          <div className="admin-row" key={x.slug}>
            <b>{i + 1}</b>
            <span>{x.title}</span>
            <em>{x.views} views</em>
          </div>
        ))}
      </section>
    </div>
  );
}
