import sanitizeHtml from "sanitize-html";

function plainTextToHtml(text) {
  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const preserveSpaces = (value) =>
    value.replace(/ {2,}/g, (spaces) => ` ${"&nbsp;".repeat(spaces.length - 1)}`);

  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .split("\n")
          .map((line) => preserveSpaces(escapeHtml(line)))
          .join("<br>")}</p>`,
    )
    .join("");
}

export default function formatArticleBody(body = "") {
  const content = /<\/?(?:p|br|h[2-4]|strong|em|b|i|u|s|blockquote|ul|ol|li|a)\b[^>]*>/i.test(
    body,
  )
    ? body
    : plainTextToHtml(body);

  return sanitizeHtml(content);
}
