import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePageMeta from "@/hooks/usePageMeta";
import { clientApi } from "@/lib/api";

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  reporter: "Reporter",
  reader: "Reader",
};

export default function AdminUsers() {
  usePageMeta({ title: "Manage Users" });
  const [users, setUsers] = useState([]);
  const [emailSearch, setEmailSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await clientApi("/auth/me");
      setCurrentUser(session.data);
      const result = await clientApi("/admin/users");
      setUsers(result.data || []);
    } catch (requestError) {
      if (requestError.status === 401) {
        navigate("/login?next=%2Fadmin%2Fusers", { replace: true });
      } else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  async function updateUser(user, field, value) {
    if (busyId) return;
    setBusyId(user.id);
    setError("");
    setMessage("");
    try {
      await clientApi(`/admin/users/${user.id}/${field}`, {
        method: "PATCH",
        body: JSON.stringify({ [field === "role" ? "role" : "status"]: value }),
      });
      setMessage(`${user.name}'s ${field === "role" ? "role" : "account status"} was updated.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="container admin-page" role="status">Loading users…</div>;

  const isSuperAdmin = currentUser?.role === "super_admin";
  const availableRoles = isSuperAdmin
    ? ["reader", "reporter", "editor", "admin", "super_admin"]
    : ["reporter", "editor"];
  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(emailSearch.trim().toLowerCase()),
  );

  return (
    <div className="container admin-page">
      <div className="page-heading">
        <span>ACCESS CONTROL</span>
        <h1>Manage users</h1>
        <p>
          {isSuperAdmin
            ? "Manage accounts and assign any newsroom role. Role changes end the user’s current session."
            : "Manage accounts and assign Editor or Reporter access. Only a Super Admin can assign administrator roles."}
        </p>
        <div className="admin-dashboard-links"><Link to="/admin">Dashboard</Link></div>
      </div>
      {error && <p className="error-msg" role="alert">{error}</p>}
      {message && <p className="form-msg" role="status">{message}</p>}
      <section className="cms-list" aria-label="User accounts">
        <h2>Accounts ({filteredUsers.length}{emailSearch ? ` of ${users.length}` : ""})</h2>
        <label className="admin-user-search">
          Search by email
          <input
            type="search"
            value={emailSearch}
            onChange={(event) => setEmailSearch(event.target.value)}
            placeholder="Enter an email address"
            aria-label="Search users by email"
          />
        </label>
        {filteredUsers.map((user) => {
          const isSelf = user.id === currentUser?.id;
          const isProtectedAdmin = ["admin", "super_admin"].includes(user.role) && !isSuperAdmin;
          const mayAssign = !isSelf && !isProtectedAdmin && (isSuperAdmin || ["reader", "reporter", "editor"].includes(user.role));
          const mayChangeStatus = !isSelf && !isProtectedAdmin && user.status !== "pending";
          return (
            <article key={user.id}>
              <div>
                <small>{user.status} · Joined {new Date(user.created_at).toLocaleDateString("en-IN")}</small>
                <h3>{user.name}{isSelf ? " (you)" : ""}</h3>
                <p>{user.email}</p>
                <div className="cms-actions">
                  <label>
                    Role
                    <select
                      aria-label={`Role for ${user.name}`}
                      value={user.role}
                      disabled={!mayAssign || busyId === user.id}
                      onChange={(event) => updateUser(user, "role", event.target.value)}
                    >
                      {!availableRoles.includes(user.role) && <option value={user.role}>{roleLabels[user.role] || user.role}</option>}
                      {availableRoles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}
                    </select>
                  </label>
                  <label>
                    Account
                    <select
                      aria-label={`Account status for ${user.name}`}
                      value={user.status === "active" ? "active" : user.status === "pending" ? "pending" : "disabled"}
                      disabled={!mayChangeStatus || busyId === user.id}
                      onChange={(event) => updateUser(user, "status", event.target.value)}
                    >
                      {user.status === "pending" && <option value="pending">Pending verification</option>}
                      <option value="active">Active</option>
                      <option value="disabled">Suspended</option>
                    </select>
                  </label>
                </div>
              </div>
            </article>
          );
        })}
        {!users.length && <p>No user accounts found.</p>}
        {users.length > 0 && !filteredUsers.length && <p>No users match that email.</p>}
      </section>
    </div>
  );
}
