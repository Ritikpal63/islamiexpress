import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { clientApi } from "@/lib/api";
import { clearLegacySession, getStoredUser } from "@/lib/auth";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function AccountMenu() {
  const [user, setUser] = useState(() => getStoredUser());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const refresh = () =>
      clientApi("/auth/me")
        .then((result) => {
          if (active) setUser(result.data || null);
        })
        .catch(() => {
          if (active) setUser(null);
        });
    refresh();
    window.addEventListener("ie-auth-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("ie-auth-change", refresh);
    };
  }, []);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await clientApi("/auth/logout", { method: "POST" });
    } catch (e) {
      if (e.status !== 401) setError(e.message);
    } finally {
      clearLegacySession();
      setUser(null);
      window.dispatchEvent(new Event("ie-auth-change"));
      navigate("/", { replace: true });
      setBusy(false);
    }
  }
  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      )
    ) {
      setError("Choose a JPEG, PNG, WebP, or AVIF profile photo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose a profile photo smaller than 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () =>
          reject(new Error("The selected profile photo could not be read."));
        reader.readAsDataURL(file);
      });
      const result = await clientApi("/auth/me/avatar", {
        method: "PATCH",
        body: JSON.stringify({ mimeType: file.type, data: encoded }),
      });
      setUser((current) => ({
        ...current,
        avatar_url: result.data.avatar_url,
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }
  if (!user)
    return (
      <Link to="/login">
        <User size={14} /> Login
      </Link>
    );
  return (
    <span className="account-menu">
      {["reporter", "editor", "admin", "super_admin"].includes(user.role) && (
        <Link to="/admin/articles">Newsroom</Link>
      )}
      {["admin", "super_admin"].includes(user.role) && (
        <Link to="/admin/ads">Ads</Link>
      )}
      <Link
        className="account-menu__identity"
        to={["reporter", "editor", "admin", "super_admin"].includes(user.role) ? "/admin" : "/"}
        aria-label={`Open ${["reporter", "editor", "admin", "super_admin"].includes(user.role) ? "newsroom dashboard" : "homepage"}`}
      >
        <User size={14} aria-hidden="true" /> {user.name}
      </Link>
      <label
        className="account-avatar-upload"
        title={uploading ? "Uploading profile photo" : "Change profile photo"}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={uploadAvatar}
          disabled={uploading}
          aria-label="Change profile photo"
        />
        <ProfileAvatar
          className="account-avatar-image"
          name={user.name}
          imageUrl={user.avatar_url}
        />
      </label>
      <button type="button" onClick={logout} disabled={busy}>
        {busy ? "Signing out…" : "Logout"}
      </button>
      {error && (
        <span className="account-avatar-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
