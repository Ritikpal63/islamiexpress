"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { clientApi } from "@/lib/api";
import { clearLegacySession } from "@/lib/auth.mjs";

export default function AccountMenu() {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const refresh = () => clientApi("/auth/me").then(result => {
      if (active) setUser(result.data || null);
    }).catch(() => { if (active) setUser(null); });
    refresh();
    window.addEventListener("ie-auth-change", refresh);
    return () => { active = false; window.removeEventListener("ie-auth-change", refresh); };
  }, []);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await clientApi("/auth/logout", { method: "POST" });
      clearLegacySession();
      setUser(null);
      window.dispatchEvent(new Event("ie-auth-change"));
      router.replace("/");
      router.refresh();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  if (!user) return <Link href="/login"><User size={14} /> Login</Link>;
  return (
    <span className="account-menu">
      {["editor", "admin", "super_admin"].includes(user.role) && <Link href="/admin/articles">Newsroom</Link>}
      <span><User size={14} aria-hidden="true" /> {user.name}</span>
      <button type="button" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Logout"}</button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
