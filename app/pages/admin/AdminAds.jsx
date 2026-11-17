import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clientApi } from "@/lib/api";
import usePageMeta from "@/hooks/usePageMeta";

const blankAd = {
  name: "",
  advertiser: "",
  position_id: "",
  creative_url: "",
  target_url: "",
  status: "draft",
  start_at: "",
  end_at: "",
};
const admins = ["admin", "super_admin"];
const typeLabels = [
  ["header", "Header"],
  ["home", "Homepage"],
  ["category", "Category pages"],
  ["article", "Article pages"],
  ["sidebar", "Side placements"],
  ["mobile", "Mobile banner"],
];

function placementGroup(code = "") {
  if (code.includes("SIDEBAR")) return "sidebar";
  if (code.startsWith("HEADER")) return "header";
  if (code.startsWith("HOME")) return "home";
  if (code.startsWith("CATEGORY")) return "category";
  if (code.startsWith("ARTICLE")) return "article";
  if (code.startsWith("MOBILE")) return "mobile";
  return "other";
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function displayDate(value) {
  if (!value) return "No end date";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminAds() {
  usePageMeta({ title: "Manage Ads" });
  const [ads, setAds] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({ ...blankAd });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await clientApi("/auth/me");
      if (!admins.includes(session.data?.role)) {
        setAuthorized(false);
        setError(
          "An administrator account is required to manage advertisements.",
        );
        return;
      }
      const [positionResult, adResult] = await Promise.all([
        clientApi("/admin/ad-positions"),
        clientApi("/admin/ads"),
      ]);
      setPositions(positionResult.data || []);
      setAds(adResult.data || []);
      setAuthorized(true);
    } catch (loadError) {
      if (loadError.status === 401)
        navigate("/login?next=%2Fadmin%2Fads", { replace: true });
      setAuthorized(false);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const groupedPositions = useMemo(
    () =>
      typeLabels
        .map(([key, title]) => ({
          key,
          title,
          items: positions.filter(
            (position) => placementGroup(position.code) === key,
          ),
        }))
        .filter((group) => group.items.length),
    [positions],
  );

  function resetForm() {
    setForm({ ...blankAd });
    setEditing(null);
  }

  function createFor(position) {
    setEditing(null);
    setForm({ ...blankAd, position_id: String(position.id) });
    setError("");
    setMessage("");
    document
      .getElementById("ad-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editAd(ad) {
    setEditing(ad.id);
    setForm({
      name: ad.name || "",
      advertiser: ad.advertiser || "",
      position_id: String(ad.position_id),
      creative_url: ad.creative_url || "",
      target_url: ad.target_url || "",
      status: ad.status || "draft",
      start_at: localDateTime(ad.start_at),
      end_at: localDateTime(ad.end_at),
    });
    setError("");
    setMessage("");
    document
      .getElementById("ad-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function uploadCreative(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      )
    ) {
      setError("Choose a JPEG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error("The selected image could not be read."));
        reader.readAsDataURL(file);
      });
      const result = await clientApi("/admin/uploads", {
        method: "POST",
        body: JSON.stringify({
          mimeType: file.type,
          data: String(dataUrl).split(",")[1],
        }),
      });
      setForm((current) => ({ ...current, creative_url: result.data.url }));
      setMessage("Image uploaded. Save the ad to publish it.");
    } catch (uploadError) {
      if (uploadError.status === 401)
        navigate("/login?next=%2Fadmin%2Fads", { replace: true });
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function saveAd(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await clientApi(editing ? `/admin/ads/${editing}` : "/admin/ads", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          position_id: Number(form.position_id),
        }),
      });
      setMessage(editing ? "Advertisement updated." : "Advertisement added.");
      resetForm();
      await load();
    } catch (saveError) {
      if (saveError.status === 401)
        navigate("/login?next=%2Fadmin%2Fads", { replace: true });
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="container admin-page" role="status">
        Loading ad placements…
      </div>
    );
  if (!authorized)
    return (
      <div className="container admin-page">
        <h1>Ad management access</h1>
        <p role="alert">{error}</p>
        <Link to="/admin">Dashboard</Link> ·{" "}
        <Link to="/login?next=%2Fadmin%2Fads">Login</Link>
      </div>
    );

  return (
    <div className="container admin-page admin-ads-page">
      <div className="page-heading">
        <span>ADVERTISEMENT MANAGER</span>
        <h1>Manage ads</h1>
        <p>
          Add and update advertisements by the place they appear. An active ad
          replaces the built-in creative; if a placement has overlapping active
          ads, the newest eligible ad is shown.
        </p>
        <Link to="/admin" className="admin-dashboard-button">
          Dashboard
        </Link>
      </div>

      <form id="ad-editor" className="admin-ad-editor" onSubmit={saveAd}>
        <div className="admin-ad-editor__heading">
          <div>
            <span>AD DETAILS</span>
            <h2>{editing ? "Update advertisement" : "Add an advertisement"}</h2>
          </div>
          {editing && (
            <button
              type="button"
              className="admin-ad-secondary"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          )}
        </div>
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
        <div className="admin-ad-form-grid">
          <label>
            Ad name
            <input
              required
              maxLength={160}
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Example: Eid sale banner"
            />
          </label>
          <label>
            Advertiser
            <input
              maxLength={180}
              value={form.advertiser}
              onChange={(event) =>
                setForm({ ...form, advertiser: event.target.value })
              }
              placeholder="Company or client name"
            />
          </label>
          <label>
            Placement
            <select
              required
              value={form.position_id}
              onChange={(event) =>
                setForm({ ...form, position_id: event.target.value })
              }
            >
              <option value="">Choose where it appears</option>
              {groupedPositions.map((group) => (
                <optgroup key={group.key} label={group.title}>
                  {group.items.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name} · {position.width || "auto"} ×{" "}
                      {position.height || "auto"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </label>
          <label className="admin-ad-form-grid__wide">
            Image URL
            <input
              required
              maxLength={500}
              value={form.creative_url}
              onChange={(event) =>
                setForm({ ...form, creative_url: event.target.value })
              }
              placeholder="https://… or upload an image below"
            />
          </label>
          <label className="admin-ad-form-grid__wide">
            Upload creative
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading}
              onChange={uploadCreative}
            />
            <small>JPEG, PNG, WebP, or AVIF; maximum 8 MB.</small>
          </label>
          {form.creative_url && (
            <img
              className="admin-ad-preview"
              src={form.creative_url}
              alt="Ad creative preview"
            />
          )}
          <label className="admin-ad-form-grid__wide">
            Click-through URL
            <input
              type="url"
              maxLength={700}
              value={form.target_url}
              onChange={(event) =>
                setForm({ ...form, target_url: event.target.value })
              }
              placeholder="https://advertiser.example"
            />
          </label>
          <label>
            Start showing
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(event) =>
                setForm({ ...form, start_at: event.target.value })
              }
            />
            <small>Leave blank to start immediately.</small>
          </label>
          <label>
            Stop showing
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(event) =>
                setForm({ ...form, end_at: event.target.value })
              }
            />
            <small>Leave blank for no end date.</small>
          </label>
        </div>
        {uploading && <p role="status">Uploading creative…</p>}
        <button
          className="admin-ad-primary"
          type="submit"
          disabled={saving || uploading}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Add advertisement"}
        </button>
      </form>

      {groupedPositions.map((group) => (
        <section className="admin-ad-group" key={group.key}>
          <div className="admin-ad-group__heading">
            <div>
              <span>PLACEMENTS</span>
              <h2>{group.title}</h2>
            </div>
          </div>
          <div className="admin-ad-placement-grid">
            {group.items.map((position) => {
              const placementAds = ads.filter(
                (ad) => Number(ad.position_id) === Number(position.id),
              );
              return (
                <article className="admin-ad-placement" key={position.id}>
                  <div className="admin-ad-placement__heading">
                    <div>
                      <h3>{position.name}</h3>
                      <p>
                        {position.width || "Responsive"} ×{" "}
                        {position.height || "Responsive"} px · {position.device}
                      </p>
                    </div>
                    <button type="button" onClick={() => createFor(position)}>
                      + Add ad
                    </button>
                  </div>
                  {placementAds.length ? (
                    placementAds.map((ad) => (
                      <div className="admin-ad-card" key={ad.id}>
                        {ad.creative_url && (
                          <img src={ad.creative_url} alt="" loading="lazy" />
                        )}
                        <div className="admin-ad-card__content">
                          <div className="admin-ad-card__title">
                            <strong>{ad.name}</strong>
                            <span
                              className={`admin-ad-status admin-ad-status--${ad.status}`}
                            >
                              {ad.status}
                            </span>
                          </div>
                          <small>
                            {ad.advertiser || "No advertiser specified"}
                          </small>
                          <small>
                            Impressions{" "}
                            {Number(ad.impressions || 0).toLocaleString(
                              "en-IN",
                            )}{" "}
                            · Clicks{" "}
                            {Number(ad.clicks || 0).toLocaleString("en-IN")}
                          </small>
                          <small>
                            {displayDate(ad.start_at)} —{" "}
                            {displayDate(ad.end_at)}
                          </small>
                          <button
                            type="button"
                            className="admin-ad-secondary"
                            onClick={() => editAd(ad)}
                          >
                            Edit ad
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="admin-ad-empty">No ad assigned here yet.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
