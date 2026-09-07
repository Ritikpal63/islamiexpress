"use client";
import { useRef, useState } from "react";
import { clientApi } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clearLegacySession, safeReturnPath } from "@/lib/auth.mjs";
export default function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const next = safeReturnPath(params.get("next"));
  const submit = async (e) => {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const d = await clientApi(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!d.user?.id) throw new Error("Login could not be completed. Please try again.");
      clearLegacySession();
      window.dispatchEvent(new Event("ie-auth-change"));
      router.replace(params.has("next") ? next : ["editor", "admin", "super_admin"].includes(d.user.role) ? "/admin/articles" : "/");
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span>ISLAMI</span> EXPRESS
      </div>
      <h1>{mode === "login" ? "Welcome back" : "Create reader account"}</h1>
      <p>
        {mode === "login"
          ? "Login to comment, like and save stories."
          : "Save stories, join discussions and personalize your reading."}
      </p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Mobile (optional)
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </>
        )}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {error && <div className="error-msg" role="alert">{error}</div>}
        <button className="primary-btn" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            New reader? <Link href={`/register?next=${encodeURIComponent(next)}`}>Create account</Link>
          </>
        ) : (
          <>
            Already registered? <Link href={`/login?next=${encodeURIComponent(next)}`}>Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
