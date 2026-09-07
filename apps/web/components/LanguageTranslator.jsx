"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

const languages = [
  ["en", "English"],
  ["hi", "Hindi / हिन्दी"], ["ur", "Urdu / اردو"],
  ["ar", "Arabic / العربية"], ["bn", "Bengali / বাংলা"],
  ["gu", "Gujarati / ગુજરાતી"], ["kn", "Kannada / ಕನ್ನಡ"],
  ["ml", "Malayalam / മലയാളം"], ["mr", "Marathi / मराठी"],
  ["pa", "Punjabi / ਪੰਜਾਬੀ"], ["ta", "Tamil / தமிழ்"],
  ["te", "Telugu / తెలుగు"], ["fr", "French / Français"],
  ["de", "German / Deutsch"], ["es", "Spanish / Español"],
  ["pt", "Portuguese / Português"], ["ru", "Russian / Русский"],
  ["zh-CN", "Chinese / 中文"], ["ja", "Japanese / 日本語"],
  ["ko", "Korean / 한국어"], ["id", "Indonesian / Indonesia"],
  ["tr", "Turkish / Türkçe"], ["fa", "Persian / فارسی"],
];

const publishedSite = "https://islamiexpress-web.vercel.app";

export default function LanguageTranslator() {
  const [language, setLanguage] = useState("hi");
  const [message, setMessage] = useState("");

  function translate(event) {
    event.preventDefault();
    let page = new URL(window.location.href);
    const host = page.hostname;
    const localPreview = host === "localhost" || host.endsWith(".localhost") || host === "[::1]" ||
      host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || !host.includes(".");
    // Keep public search parameters, but never forward fragments or account pages.
    if (/^\/(admin|login|register|saved)(\/|$)/.test(page.pathname)) {
      setMessage("Open a public news page to translate it.");
      return;
    }
    if (localPreview) {
      // Google can fetch the published page, but cannot reach a local server.
      const publishedPage = new URL(publishedSite);
      publishedPage.pathname = page.pathname;
      publishedPage.search = page.search;
      page = publishedPage;
    }
    page.hash = "";
    [...page.searchParams.keys()].forEach((key) => {
      if (key !== "q" && key !== "page") page.searchParams.delete(key);
    });
    const target = new URL("https://translate.google.com/translate");
    target.search = new URLSearchParams({ sl: "auto", tl: language === "more" ? "hi" : language, u: page.href }).toString();
    window.open(target.href, "_blank", "noopener,noreferrer");
    setMessage(localPreview ? "Opened the published version of this page. Local changes are not included." : "");
  }

  return (
    <details className="language-translator notranslate" translate="no">
      <summary><Languages size={15} aria-hidden="true" /> Translate</summary>
      <form className="translation-panel" onSubmit={translate}>
        <label htmlFor="translation-language">Translate into</label>
        <select id="translation-language" value={language} onChange={(event) => {
          setLanguage(event.target.value);
          setMessage("");
        }}>
          {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          <option value="more">More languages…</option>
        </select>
        <button type="submit">{language === "more" ? "Open and choose a language ↗" : "Translate page ↗"}</button>
        <p>Opens Google Translate in a new tab. Choose any other supported language there.</p>
        <p>In local preview, translation uses the published website.</p>
        <p>Automatic translations may contain errors.</p>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
