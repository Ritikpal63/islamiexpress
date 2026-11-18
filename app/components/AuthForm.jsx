import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { clientApi } from "@/lib/api";
import { safeReturnPath } from "@/lib/auth";

export default function AuthForm({ mode = "login" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const next = safeReturnPath(params.get("next"));

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function selectAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or AVIF profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose a profile photo smaller than 8 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setAvatarFile(file);
  }

  function finishAuthentication(user) {
    if (!user?.id) throw new Error("Verification could not be completed. Please try again.");
    window.dispatchEvent(new Event("ie-auth-change"));
    const target = params.has("next")
      ? next
      : ["reporter", "editor", "admin", "super_admin"].includes(user.role)
        ? "/admin"
        : "/";
    navigate(target, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const payload = { ...form };
      if (mode === "register" && avatarFile) {
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("The selected profile photo could not be read."));
          reader.readAsDataURL(avatarFile);
        });
        payload.avatar_mime_type = avatarFile.type;
        payload.avatar_data = encoded;
      }
      const result = await clientApi(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.requiresOtp) {
        setOtpStep(true);
        setOtpCode("");
        setNotice(`A six-digit verification code was sent to ${result.email || form.email}.`);
        return;
      }
      finishAuthentication(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await clientApi("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email, code: otpCode, purpose: mode === "register" ? "register" : "login" }),
      });
      finishAuthentication(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const result = await clientApi("/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify({ email: form.email, purpose: mode === "register" ? "register" : "login" }),
      });
      setNotice(result.message || `If eligible, a new code was sent to ${form.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo"><span>ISLAMI</span> EXPRESS</div>
      <h1>{otpStep ? "Verify your email" : mode === "login" ? "Welcome back" : "Create reader account"}</h1>
      <p>{otpStep
        ? `Enter the six-digit code sent to ${form.email}. The code expires in 10 minutes.`
        : mode === "login"
          ? "Login to comment, like and save stories."
          : "Save stories, join discussions and personalize your reading."}</p>
      <form onSubmit={otpStep ? verifyOtp : submit}>
        {!otpStep ? <>
          {mode === "register" && <>
            <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Mobile (optional)<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Profile photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={selectAvatar} /><small>JPEG, PNG, WebP, or AVIF; maximum 8 MB.</small></label>
            {avatarPreview && <img className="auth-avatar-preview" src={avatarPreview} alt="Profile photo preview" />}
          </>}
          <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {error && <div className="error-msg" role="alert">{error}</div>}
          <button className="primary-btn" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? "Continue to email verification" : "Create account"}</button>
        </> : <>
          <label>Email verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          {notice && <p className="form-msg" role="status">{notice}</p>}
          {error && <div className="error-msg" role="alert">{error}</div>}
          <button className="primary-btn" disabled={submitting}>{submitting ? "Verifying…" : "Verify and continue"}</button>
          <button type="button" className="auth-otp-secondary" onClick={resendOtp} disabled={submitting}>Resend code</button>
          <button type="button" className="auth-otp-secondary" onClick={() => { setOtpStep(false); setOtpCode(""); setError(""); setNotice(""); }}>Back to {mode === "login" ? "login" : "registration"}</button>
        </>}
      </form>
      {!otpStep && <div className="auth-switch">{mode === "login" ? <>New reader? <Link to={`/register?next=${encodeURIComponent(next)}`}>Create account</Link></> : <>Already registered? <Link to={`/login?next=${encodeURIComponent(next)}`}>Login</Link></>}</div>}
    </div>
  );
}
