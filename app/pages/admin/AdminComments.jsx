
import { useCallback, useEffect, useRef, useState } from "react";
import usePageMeta from "@/hooks/usePageMeta";
import { Link, useNavigate } from "react-router-dom";
import { clientApi } from "@/lib/api";

const editorRoles = ["editor", "admin", "super_admin"];
const statuses = ["pending", "approved", "spam", "rejected"];

export default function AdminComments() {
	usePageMeta({ title: "Reader Comments" });
	const [items, setItems] = useState([]);
	const [status, setStatus] = useState("pending");
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const requestId = useRef(0);

	const load = useCallback(async () => {
		const currentRequest = ++requestId.current;
		setLoading(true);
		setError("");
		try {
			const session = await clientApi("/auth/me");
			if (!editorRoles.includes(session.data?.role)) {
				setAuthorized(false);
				setItems([]);
				setError("An editor or administrator account is required to moderate comments.");
				return;
			}
			const result = await clientApi(`/admin/comments?status=${status}`);
			if (currentRequest === requestId.current) {
				setItems(result.data || []);
				setAuthorized(true);
			}
		} catch (requestError) {
			if (requestError.status === 401) {
				navigate(`/login?next=${encodeURIComponent("/admin/comments")}`, { replace: true });
			} else {
				setAuthorized(false);
				setItems([]);
				setError(requestError.message);
			}
		} finally {
			if (currentRequest === requestId.current) setLoading(false);
		}
	}, [navigate, status]);

	useEffect(() => {
		load();
	}, [load]);

	async function moderate(id, nextStatus) {
		if (busyId) return;
		setBusyId(id);
		setError("");
		try {
			await clientApi(`/comments/${id}/moderate`, {
				method: "PATCH",
				body: JSON.stringify({ status: nextStatus }),
			});
			await load();
		} catch (requestError) {
			if (requestError.status === 401) {
				navigate(`/login?next=${encodeURIComponent("/admin/comments")}`, { replace: true });
			} else setError(requestError.message);
		} finally {
			setBusyId(null);
		}
	}

	if (loading && !authorized)
		return <div className="container admin-page" role="status">Loading moderation queue…</div>;

	if (!authorized)
		return (
			<div className="container admin-page">
				<h1>Moderation access</h1>
				<p role="alert">{error}</p>
				<Link to="/login?next=%2Fadmin%2Fcomments">Login</Link>{" "}
				<button type="button" onClick={load}>Retry</button>
			</div>
		);

	return (
		<div className="container admin-page">
			<div className="page-heading">
				<span>MODERATION</span>
				<h1>Reader Comments</h1>
				<p>Review discussion before it appears alongside monetized news content.</p>
				<Link to="/admin" className="admin-dashboard-button">Dashboard</Link>
			</div>
			<div className="moderation-tabs" role="tablist" aria-label="Comment status">
				{statuses.map((nextStatus) => (
					<button
						type="button"
						className={status === nextStatus ? "active" : ""}
						onClick={() => setStatus(nextStatus)}
						aria-selected={status === nextStatus}
						role="tab"
						key={nextStatus}
					>
						{nextStatus}
					</button>
				))}
			</div>
			{error && <p className="error-msg" role="alert">{error}</p>}
			{loading ? (
				<p role="status">Loading comments…</p>
			) : items.length ? (
				<div className="moderation-list">
					{items.map((comment) => (
						<article key={comment.id}>
							<small>{comment.user_name} on {comment.article_title}</small>
							<p>{comment.body}</p>
							<div>
								<button type="button" disabled={busyId !== null} onClick={() => moderate(comment.id, "approved")}>Approve</button>
								<button type="button" disabled={busyId !== null} onClick={() => moderate(comment.id, "rejected")}>Reject</button>
								<button type="button" disabled={busyId !== null} onClick={() => moderate(comment.id, "spam")}>Spam</button>
							</div>
						</article>
					))}
				</div>
			) : (
				<p>No {status} comments found.</p>
			)}
		</div>
	);
}
