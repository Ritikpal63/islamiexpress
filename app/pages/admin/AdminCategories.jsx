import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePageMeta from "@/hooks/usePageMeta";
import { clientApi } from "@/lib/api";

const blank = { name: "", description: "", display_order: 0, is_active: true };
const editors = ["editor", "admin", "super_admin"];

export default function AdminCategories() {
  usePageMeta({ title: "Manage Categories" });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await clientApi("/auth/me");
      if (!editors.includes(session.data?.role)) throw new Error("An editor or administrator account is required to manage categories.");
      const result = await clientApi("/admin/categories");
      setCategories(result.data || []);
    } catch (err) {
      if (err.status === 401) navigate("/login?next=%2Fadmin%2Fcategories", { replace: true });
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      await clientApi(editing ? `/admin/categories/${editing}` : "/admin/categories", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setMessage(editing ? "Category updated." : "Category added.");
      setForm({ ...blank }); setEditing(null);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  function edit(category) {
    setEditing(category.id);
    setForm({ name: category.name, description: category.description || "", display_order: category.display_order || 0, is_active: Boolean(category.is_active) });
    setError(""); setMessage("");
  }

  async function remove(category) {
    if (!window.confirm(`Delete “${category.name}”? Categories used by articles will be hidden from the site and can be restored by editing them.`)) return;
    setError(""); setMessage("");
    try {
      const result = await clientApi(`/admin/categories/${category.id}`, { method: "DELETE" });
      setMessage(result.message || "Category deleted.");
      if (editing === category.id) { setEditing(null); setForm({ ...blank }); }
      await load();
    } catch (err) { setError(err.message); }
  }

  if (loading) return <div className="container admin-page" role="status">Loading categories…</div>;
  return (
    <div className="container admin-page">
      <div className="page-heading">
        <span>NEWSROOM CMS</span><h1>Manage categories</h1>
        <p>Add, rename, reorder, or remove categories used by the site and article editor.</p>
        <div className="admin-dashboard-links"><Link to="/admin">Dashboard</Link><Link to="/admin/articles">Manage news</Link></div>
      </div>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {message && <p className="form-msg" role="status">{message}</p>}
      <div className="cms-grid">
        <form className="cms-form" onSubmit={submit}>
          <h2>{editing ? "Edit category" : "Add category"}</h2>
          <fieldset disabled={saving}>
            <label>Category name<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Description<textarea maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Display order<input type="number" min="0" max="100000" step="1" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></label>
            <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Show on site and in article editor</label>
            <button className="primary-btn">{saving ? "Saving…" : editing ? "Save category" : "Add category"}</button>
          </fieldset>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...blank }); }}>Cancel editing</button>}
        </form>
        <section className="cms-list">
          <h2>Categories ({categories.length})</h2>
          {!categories.length && <p>No categories yet.</p>}
          {categories.map((category) => (
            <article key={category.id}>
              <div>
                <small>{category.is_active ? "Active" : "Hidden"} · {category.article_count} {Number(category.article_count) === 1 ? "article" : "articles"} · Order {category.display_order}</small>
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
                <div className="cms-actions">
                  <button type="button" onClick={() => edit(category)}>Edit</button>
                  <button type="button" onClick={() => remove(category)}>{Number(category.article_count) ? "Hide" : "Delete"}</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
