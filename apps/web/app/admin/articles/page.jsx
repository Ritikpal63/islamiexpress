"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/api";
import Link from "next/link";

const emptyForm = {
  title: "", summary: "", body: "", category_id: "", featured_image: "", language: "hi",
  status: "draft", news_type: "normal", is_top_story: false, is_featured: false,
  is_editors_pick: false, allow_comments: true,
};
const editors = ["editor", "admin", "super_admin"];

export default function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const pending = useRef(false);
  const formRef = useRef(null);
  const router = useRouter();

  const handleError = useCallback((error) => {
    if (error.status === 401) router.replace("/login?next=%2Fadmin%2Farticles");
    else setError(error.message);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await clientApi("/auth/me");
      if (!editors.includes(session.data?.role)) {
        setAuthorized(false);
        setError("An editor or administrator account is required to manage news.");
        return;
      }
      const [news, cats] = await Promise.all([clientApi("/admin/articles"), clientApi("/public/categories")]);
      setArticles(news.data || []);
      setCategories(cats.data || []);
      setAuthorized(true);
    } catch (error) { setAuthorized(false); handleError(error); }
    finally { setLoading(false); }
  }, [handleError]);

  useEffect(() => { load(); }, [load]);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm(previous => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
  }

  async function edit(id) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await clientApi(`/admin/articles/${id}`);
      const article = result.data;
      const next = {};
      for (const key of Object.keys(emptyForm)) next[key] = article[key] ?? emptyForm[key];
      for (const key of ["is_top_story", "is_featured", "is_editors_pick", "allow_comments"]) next[key] = Boolean(next[key]);
      next.category_id = String(next.category_id);
      setForm(next);
      setEditing(id);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { handleError(error); }
    finally { pending.current = false; setSaving(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    if (!categories.some(category => String(category.id) === String(form.category_id))) {
      setError("Choose an active category before saving."); return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await clientApi(editing ? `/articles/${editing}` : "/articles", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, title: form.title.trim(), category_id: Number(form.category_id) }),
      });
      setMessage(result.data.status === "published" ? "Article published. It is available in its selected category." : `Article saved as ${result.data.status}.`);
      setForm({ ...emptyForm });
      setEditing(null);
      try {
        const news = await clientApi("/admin/articles");
        setArticles(news.data || []);
        setListError("");
      } catch { setListError("Article saved, but the recent articles list could not refresh. Reload the page to see it."); }
      router.refresh();
    } catch (error) { handleError(error); }
    finally { pending.current = false; setSaving(false); }
  }

  if (loading) return <div className="container admin-page" role="status">Loading newsroom…</div>;
  if (!authorized) return <div className="container admin-page"><h1>Newsroom access</h1><p role="alert">{error}</p><Link href="/login?next=%2Fadmin%2Farticles">Login</Link> <button type="button" onClick={load}>Retry</button></div>;
  return (
    <div className="container admin-page">
      <div className="page-heading"><span>NEWSROOM CMS</span><h1>Manage news</h1><p>Write a story, choose its category, and save a draft or publish it.</p><Link href="/admin">Dashboard</Link></div>
      <div className="cms-grid">
        <form ref={formRef} className="cms-form" onSubmit={submit}>
          <h2>{editing ? "Edit article" : "New article"}</h2>
          {error && <p className="error-msg" role="alert">{error}</p>}
          {message && <p className="form-msg" role="status">{message}</p>}
          {!categories.length && <p role="alert">No active categories are available. Add or activate a category in the database before publishing.</p>}
          <fieldset disabled={saving || !categories.length}>
            <label>Headline<input name="title" required maxLength={300} value={form.title} onChange={change} /></label>
            <label>Summary<textarea name="summary" maxLength={800} value={form.summary} onChange={change} /></label>
            <label>Article body<textarea name="body" required maxLength={200000} className="body-editor" value={form.body} onChange={change} aria-describedby="body-help" /></label>
            <small id="body-help">Write text or use basic HTML for paragraphs, headings, lists and links.</small>
            <label>Featured image URL<input name="featured_image" maxLength={500} value={form.featured_image} onChange={change} placeholder="https://… or /assets/…" /></label>
            <div className="cms-split">
              <label>Category<select name="category_id" required value={form.category_id} onChange={change}>
                <option value="">Choose a category</option>
                {categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}
              </select></label>
              <label>News type<select name="news_type" value={form.news_type} onChange={change}>
                {[["normal", "News"], ["breaking", "Breaking"], ["exclusive", "Exclusive"], ["live", "Live"], ["fact_check", "Fact check"], ["opinion", "Opinion"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select></label>
            </div>
            <label>Article language<select name="language" value={form.language} onChange={change}>
              <option value="hi">Hindi</option><option value="en">English</option><option value="ur">Urdu</option>
              {!["hi", "en", "ur"].includes(form.language) && <option value={form.language}>{form.language}</option>}
            </select></label>
            <div className="cms-checks">
              {[["is_top_story", "Top story"], ["is_featured", "Featured"], ["is_editors_pick", "Editor's pick"], ["allow_comments", "Allow comments"]].map(([key, label]) => <label key={key}><input name={key} type="checkbox" checked={form[key]} onChange={change} /> {label}</label>)}
            </div>
            <label>Status<select name="status" value={form.status} onChange={change}>
              <option value="draft">Draft</option><option value="review">In review</option><option value="published">Published</option>
              {editing && <option value="archived">Archived</option>}
              {!["draft", "review", "published", "archived"].includes(form.status) && <option value={form.status} disabled>{form.status} — choose a new status to save</option>}
            </select></label>
            <button className="primary-btn" disabled={saving || !["draft", "review", "published", "archived"].includes(form.status)}>{saving ? "Saving…" : form.status === "published" ? "Publish article" : "Save article"}</button>
          </fieldset>
          {editing && <button type="button" disabled={saving} onClick={() => { setEditing(null); setForm({ ...emptyForm }); setError(""); }}>Cancel editing</button>}
        </form>
        <div className="cms-list"><h2>Recent articles</h2>
          {listError && <p role="alert">{listError}</p>}
          {!articles.length && <p>No articles yet. Create your first story using the form.</p>}
          {articles.map(article => <article key={article.id}>
            <div><small>{article.category_name} • {article.status}</small><h3>{article.title}</h3>
              <p>{article.author_name} • {new Date(article.updated_at).toLocaleString("en-IN")}</p>
              <div className="cms-actions"><button type="button" disabled={saving} onClick={() => edit(article.id)}>Edit</button>
                {article.status === "published" && <Link href={`/article/${article.slug}`}>View article →</Link>}
              </div>
            </div>
          </article>)}
        </div>
      </div>
    </div>
  );
}
