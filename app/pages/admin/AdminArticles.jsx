
import { useCallback, useEffect, useRef, useState } from "react";
import usePageMeta from "@/hooks/usePageMeta";
import { useNavigate, Link } from "react-router-dom";
import { clientApi } from "@/lib/api";

const emptyForm = {
  title: "",
  summary: "",
  body: "",
  category_id: "",
  featured_image: "",
  language: "hi",
  status: "draft",
  news_type: "normal",
  is_top_story: false,
  is_featured: false,
  is_editors_pick: false,
  allow_comments: true,
};
const newsroomRoles = ["reporter", "editor", "admin", "super_admin"];

export default function AdminArticles() {
  usePageMeta({ title: "Manage News" });
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const pending = useRef(false);
  const formRef = useRef(null);
  const navigate = useNavigate();

  const handleError = useCallback(
    (error) => {
      if (error.status === 401)
        navigate("/login?next=%2Fadmin%2Farticles", { replace: true });
      else setError(error.message);
    },
    [navigate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await clientApi("/auth/me");
      if (!newsroomRoles.includes(session.data?.role)) {
        setAuthorized(false);
        setError(
          "A newsroom account is required to manage news.",
        );
        return;
      }
      setUserRole(session.data.role);
      if (session.data.role === "reporter") setForm((current) => ({ ...current, status: "review" }));
      const [news, cats] = await Promise.all([
        clientApi("/admin/articles"),
        clientApi("/public/categories"),
      ]);
      setArticles(news.data || []);
      setCategories(cats.data || []);
      setAuthorized(true);
    } catch (error) {
      setAuthorized(false);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    load();
  }, [load]);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }

    setUploadingImage(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The selected image could not be read."));
        reader.readAsDataURL(file);
      });
      const result = await clientApi("/admin/uploads", {
        method: "POST",
        body: JSON.stringify({ mimeType: file.type, data: String(dataUrl).split(",")[1] }),
      });
      setForm((previous) => ({ ...previous, featured_image: result.data.url }));
      setMessage("Image uploaded. Save the article to use it.");
    } catch (uploadError) {
      handleError(uploadError);
    } finally {
      setUploadingImage(false);
    }
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
      for (const key of Object.keys(emptyForm))
        next[key] = article[key] ?? emptyForm[key];
      for (const key of [
        "is_top_story",
        "is_featured",
        "is_editors_pick",
        "allow_comments",
      ])
        next[key] = Boolean(next[key]);
      next.category_id = String(next.category_id);
      setForm(next);
      setEditing(id);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      handleError(error);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    if (
      !categories.some(
        (category) => String(category.id) === String(form.category_id),
      )
    ) {
      setError("Choose an active category before saving.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await clientApi(
        editing ? `/articles/${editing}` : "/articles",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            title: form.title.trim(),
            category_id: String(form.category_id),
          }),
        },
      );
      setMessage(
        result.data.status === "published"
          ? "Article published. It is available in its selected category."
          : userRole === "reporter" && result.data.status === "review"
            ? "Article submitted for editorial review."
            : `Article saved as ${result.data.status}.`,
      );
      setForm({ ...emptyForm });
      setEditing(null);
      try {
        const news = await clientApi("/admin/articles");
        setArticles(news.data || []);
        setListError("");
      } catch {
        setListError(
          "Article saved, but the recent articles list could not refresh. Reload the page to see it.",
        );
      }
      
    } catch (error) {
      handleError(error);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="container admin-page" role="status">
        Loading newsroom…
      </div>
    );
  if (!authorized)
    return (
      <div className="container admin-page">
        <h1>Newsroom access</h1>
        <p role="alert">{error}</p>
        <Link to="/login?next=%2Fadmin%2Farticles">Login</Link>{" "}
        <button type="button" onClick={load}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="container admin-page">
      <div className="page-heading">
        <span>NEWSROOM CMS</span>
        <h1>Manage news</h1>
        <p>
          {userRole === "reporter"
            ? "Submit a story for review. Editors and administrators decide when it is published."
            : "Write, review, and publish newsroom stories."}
        </p>
        <div className="admin-dashboard-links">
          <Link to="/admin">Dashboard</Link>
          {userRole !== "reporter" && <Link to="/admin/categories">Manage categories</Link>}
        </div>
      </div>
      <div className="cms-grid">
        <form ref={formRef} className="cms-form" onSubmit={submit}>
          <h2>{editing ? "Edit article" : "New article"}</h2>
          {error && (
            <p className="error-msg" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-msg" role="status">
              {message}
            </p>
          )}
          {!categories.length && (
            <p role="alert">
              No active categories are available. {userRole === "reporter"
                ? "Ask an editor or administrator to add one."
                : <>Add or activate one from <Link to="/admin/categories">Manage categories</Link>.</>}
            </p>
          )}
          <fieldset >
            <label>
              Headline
              <input
                name="title"
                required
                maxLength={300}
                value={form.title}
                onChange={change}
              />
            </label>
            <label>
              Summary
              <textarea
                name="summary"
                maxLength={800}
                value={form.summary}
                onChange={change}
              />
            </label>
            <label>
              Article body
              <textarea
                name="body"
                required
                maxLength={200000}
                className="body-editor"
                value={form.body}
                onChange={change}
                aria-describedby="body-help"
              />
            </label>
            <small id="body-help">
              Separate plain-text paragraphs with a blank line, or use basic
              HTML for paragraphs, headings, lists and links.
            </small>
            <label>
              Featured image URL (or upload below)
              <input
                name="featured_image"
                maxLength={500}
                value={form.featured_image}
                onChange={change}
                placeholder="https://… or /assets/…"
              />
            </label>
            <label>
              Upload an image from this device
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={uploadImage}
                disabled={uploadingImage}
                aria-describedby="image-upload-help"
              />
              <small id="image-upload-help">
                JPEG, PNG, WebP, or AVIF; maximum 8 MB. Uploading fills the image URL above.
              </small>
            </label>
            {form.featured_image && (
              <img
                src={form.featured_image}
                alt="Featured image preview"
                style={{ display: "block", maxWidth: "100%", maxHeight: 260, objectFit: "contain", objectPosition: "left" }}
              />
            )}
            {uploadingImage && <p role="status">Uploading image…</p>}
            <div className="cms-split">
              <label htmlFor="article-category">
                Category
                <select
                  id="article-category"
                  name="category_id"
                  aria-label="Category"
                  required
                  value={form.category_id}
                  onChange={change}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                News type
                <select
                  name="news_type"
                  value={form.news_type}
                  onChange={change}
                >
                  {[
                    ["normal", "News"],
                    ["breaking", "Breaking"],
                    ["exclusive", "Exclusive"],
                    ["live", "Live"],
                    ["fact_check", "Fact check"],
                    ["opinion", "Opinion"],
                  ].map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Article language
              <select name="language" value={form.language} onChange={change}>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
                <option value="ur">Urdu</option>
                {!["hi", "en", "ur"].includes(form.language) && (
                  <option value={form.language}>{form.language}</option>
                )}
              </select>
            </label>
            <div className="cms-checks">
              {[
                ["is_top_story", "Top story"],
                ["is_featured", "Featured"],
                ["is_editors_pick", "Editor's pick"],
                ["allow_comments", "Allow comments"],
              ].filter(([key]) => userRole !== "reporter" || key === "allow_comments").map(([key, label]) => (
                <label key={key}>
                  <input
                    name={key}
                    type="checkbox"
                    checked={form[key]}
                    onChange={change}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
            {userRole === "reporter" ? (
              <p className="form-msg">Reporter submissions are sent to editorial review. You can edit your own submissions; only an editor or administrator can approve or publish them.</p>
            ) : <label>
              Status
              <select name="status" value={form.status} onChange={change}>
                <option value="draft">Draft</option>
                <option value="review">In review</option>
                <option value="published">Published</option>
                {editing && <option value="archived">Archived</option>}
                {!["draft", "review", "published", "archived"].includes(
                  form.status,
                ) && (
                  <option value={form.status} disabled>
                    {form.status} — choose a new status to save
                  </option>
                )}
              </select>
            </label>}
            <button
              className="primary-btn"
              disabled={
                saving ||
                !["draft", "review", "published", "archived"].includes(
                  form.status,
                )
              }
            >
              {saving
                ? "Saving…"
                : userRole === "reporter"
                  ? editing ? "Update submission" : "Submit for review"
                  : form.status === "published"
                  ? "Publish article"
                  : "Save article"}
            </button>
          </fieldset>
          {editing && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(null);
                setForm({ ...emptyForm });
                setError("");
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
        <div className="cms-list">
          <h2>Recent articles</h2>
          {listError && <p role="alert">{listError}</p>}
          {!articles.length && (
            <p>No articles yet. Create your first story using the form.</p>
          )}
          {articles.map((article) => (
            <article key={article.id}>
              <div>
                <small>
                  {article.category_name} • {article.status}
                </small>
                <h3>{article.title}</h3>
                <p>
                  {article.author_name} •{" "}
                  {new Date(article.updated_at).toLocaleString("en-IN")}
                </p>
                <div className="cms-actions">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => edit(article.id)}
                  >
                    Edit
                  </button>
                  {article.status === "published" && (
                    <Link to={`/article/${article.slug}`}>
                      View article →
                    </Link>
                  )}
                  {["admin", "super_admin"].includes(userRole) && <button
                    type="button"
                    disabled={saving || deleting === article.id}
                    onClick={async () => {
                      if (!window.confirm(`Permanently delete “${article.title}”? Its comments and engagement records will also be removed.`)) return;
                      setDeleting(article.id);
                      setError(""); setMessage(""); setListError("");
                      try {
                        await clientApi(`/articles/${article.id}`, { method: "DELETE" });
                        setArticles((current) => current.filter((item) => item.id !== article.id));
                        if (editing === article.id) { setEditing(null); setForm({ ...emptyForm }); }
                        setMessage("Article deleted.");
                      } catch (deleteError) { handleError(deleteError); }
                      finally { setDeleting(null); }
                    }}
                  >
                    {deleting === article.id ? "Deleting…" : "Delete"}
                  </button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
