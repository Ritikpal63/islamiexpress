"use client";
import { useState } from "react";
import { clientApi } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await clientApi(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("ie_token", d.token);
      localStorage.setItem("ie_user", JSON.stringify(d.user));
      router.push(params.get("next") || "/");
    } catch (e) {
      setError(e.message);
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
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {error && <div className="error-msg">{error}</div>}
        <button className="primary-btn">
          {mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            New reader? <Link href="/register">Create account</Link>
          </>
        ) : (
          <>
            Already registered? <Link href="/login">Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
