"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/api";
import { clearLegacySession } from "@/lib/auth.mjs";
import { ThumbsUp, Flag } from "lucide-react";

export default function Comments({ articleId, enabled = true }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const router = useRouter();
  const draftKey = `ie-comment-draft:${articleId}`;

  const load = useCallback(async (signal) => {
    try {
      const result = await clientApi(`/comments/article/${articleId}`, { signal });
      if (signal?.aborted) return;
      setItems(result.data || []);
      setLoadError("");
    } catch (error) {
      if (!signal?.aborted) setLoadError(error.message);
    }
  }, [articleId]);

  useEffect(() => {
    setItems([]);
    setMessage("");
    try { setBody(sessionStorage.getItem(draftKey) || ""); } catch { setBody(""); }
    const controller = new AbortController();
    if (enabled) load(controller.signal);
    return () => controller.abort();
  }, [draftKey, enabled, load]);

  function changeBody(value) {
    setBody(value);
    try {
      if (value) sessionStorage.setItem(draftKey, value);
      else sessionStorage.removeItem(draftKey);
    } catch {}
  }

  function handleError(error) {
    if (error.status === 401) {
      clearLegacySession();
      window.dispatchEvent(new Event("ie-auth-change"));
      const next = `${window.location.pathname}${window.location.search}#comments`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } else setMessage(error.message);
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    if (body.trim().length < 2) { setMessage("Please write at least 2 characters."); return; }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await clientApi(`/comments/article/${articleId}`, {
        method: "POST", body: JSON.stringify({ body: body.trim() }),
      });
      changeBody("");
      setMessage(result.data.status === "pending" ? "Comment submitted for moderation." : "Comment posted.");
      await load();
    } catch (error) { handleError(error); }
    finally { pending.current = false; setBusy(false); }
  }

  async function action(id, type) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await clientApi(`/comments/${id}/${type}`, {
        method: "POST", ...(type === "report" ? { body: JSON.stringify({ reason: "User report" }) } : {}),
      });
      if (type === "report") setMessage("Comment reported for review.");
      else await load();
    } catch (error) { handleError(error); }
    finally { pending.current = false; setBusy(false); }
  }

  if (!enabled) return <div id="comments" className="comments-closed">Comments are closed for this article.</div>;
  return (
    <section id="comments" className="comments">
      <div className="section-title"><h2>Comments ({items.length})</h2></div>
      <form className="comment-form" onSubmit={submit}>
        <textarea aria-label="Your comment" value={body} onChange={event => changeBody(event.target.value)}
          disabled={busy} maxLength={2000} minLength={2} required
          placeholder="Join the conversation. Keep it respectful and relevant." />
        <div><small>{body.length}/2000</small><button disabled={busy}>{busy ? "Please wait…" : "Post comment"}</button></div>
      </form>
      {message && <p className="form-msg" role="status">{message}</p>}
      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => load()}>Retry</button></p>}
      <div className="comment-list">{items.map(comment => (
        <article className="comment" key={comment.id}>
          <div className="avatar">{comment.name?.[0] || "U"}</div>
          <div>
            <div className="comment-head"><b>{comment.name}</b><time>{new Date(comment.created_at).toLocaleString("en-IN")}</time></div>
            <p>{comment.body}</p>
            <div className="comment-actions">
              <button type="button" disabled={busy} onClick={() => action(comment.id, "like")} aria-label="Like comment"><ThumbsUp /> {comment.like_count || 0}</button>
              <button type="button" disabled={busy} onClick={() => action(comment.id, "report")}><Flag /> Report</button>
            </div>
          </div>
        </article>
      ))}</div>
    </section>
  );
}
