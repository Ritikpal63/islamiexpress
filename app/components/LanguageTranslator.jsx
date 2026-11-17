import { Languages } from "lucide-react";
import { useRef, useState } from "react";
import { clientApi } from "@/lib/api";

const languages = [
  ["en", "English"],
  ["as", "Assamese / অসমীয়া"],
  ["bn", "Bengali / বাংলা"],
  ["brx", "Bodo / बड़ो"],
  ["doi", "Dogri / डोगरी"],
  ["gu", "Gujarati / ગુજરાતી"],
  ["hi", "Hindi / हिन्दी"],
  ["kn", "Kannada / ಕನ್ನಡ"],
  ["ks", "Kashmiri / कश्मीरी"],
  ["gom", "Konkani / कोंकणी"],
  ["mai", "Maithili / मैथिली"],
  ["ml", "Malayalam / മലയാളം"],
  ["mni-Mtei", "Manipuri (Meitei) / মৈতৈলোন্"],
  ["mr", "Marathi / मराठी"],
  ["ne", "Nepali / नेपाली"],
  ["or", "Odia / ଓଡ଼ିଆ"],
  ["pa", "Punjabi / ਪੰਜਾਬੀ"],
  ["sa", "Sanskrit / संस्कृतम्"],
  ["sat", "Santali / ᱥᱟᱱᱛᱟᱲᱤ"],
  ["sd", "Sindhi / سنڌي"],
  ["ta", "Tamil / தமிழ்"],
  ["te", "Telugu / తెలుగు"],
  ["ur", "Urdu / اردو"],
];

const excludedText = ".language-translator, [translate='no'], script, style, noscript, textarea, input, select, option, code, pre, svg, [aria-hidden='true']";

function getPageTextNodes() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    const value = node.nodeValue || "";
    if (!parent || !value.trim() || parent.closest(excludedText) || value.length > 5000) continue;
    nodes.push(node);
  }
  return nodes;
}

export default function LanguageTranslator() {
  const [language, setLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [message, setMessage] = useState("");
  const originals = useRef([]);
  const requestId = useRef(0);

  function restoreOriginal() {
    requestId.current += 1;
    for (const { node, value } of originals.current) {
      if (node.isConnected) node.nodeValue = value;
    }
    originals.current = [];
    setTranslating(false);
  }

  async function translatePage(event) {
    event.preventDefault();
    restoreOriginal();
    setMessage("");
    if (language === "en") {
      setMessage("Original English restored.");
      return;
    }
    if (/^\/(admin|login|register|saved)(\/|$)/.test(window.location.pathname)) {
      setMessage("Translation is available on public news pages.");
      return;
    }

    const currentRequest = ++requestId.current;
    const nodes = getPageTextNodes();
    const records = nodes.map((node) => ({ node, value: node.nodeValue, translated: "" }));
    originals.current = records;
    setTranslating(true);

    try {
      let start = 0;
      while (start < records.length) {
        if (requestId.current !== currentRequest) return;
        let end = start;
        let characters = 0;
        while (end < records.length && end - start < 50 && characters + records[end].value.length <= 20000) {
          characters += records[end].value.length;
          end += 1;
        }
        if (end === start) end += 1;
        const result = await clientApi("/public/translate", {
          method: "POST",
          body: JSON.stringify({ language, texts: records.slice(start, end).map((record) => record.value) }),
        });
        if (requestId.current !== currentRequest) return;
        const translated = result.data?.translations || [];
        if (translated.length !== end - start) throw new Error("The translation service returned an incomplete page.");
        for (let index = start; index < end; index += 1) {
          records[index].translated = translated[index - start];
          if (records[index].node.isConnected) records[index].node.nodeValue = translated[index - start];
        }
        start = end;
      }
      setMessage(`Page translated to ${languages.find(([code]) => code === language)?.[1] || language}. Automatic translations may contain errors.`);
    } catch (error) {
      restoreOriginal();
      setMessage(error.message);
    } finally {
      if (requestId.current === currentRequest) setTranslating(false);
    }
  }

  return (
    <details className="language-translator notranslate" translate="no">
      <summary><Languages size={15} aria-hidden="true" /> Translate</summary>
      <form className="translation-panel" onSubmit={translatePage}>
        <label htmlFor="translation-language">Translate this page into</label>
        <select id="translation-language" value={language} disabled={translating} onChange={(event) => {
          setLanguage(event.target.value);
          setMessage("");
        }}>
          {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <button type="submit" disabled={translating}>{translating ? "Translating page…" : language === "en" ? "Show original English" : "Translate on this page"}</button>
        <p>This translates the current page in place. Translation quality may vary.</p>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
