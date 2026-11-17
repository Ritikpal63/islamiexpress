import { useEffect } from "react";

function setMeta(name, content, attr = "name") {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export default function usePageMeta({ title, description, image } = {}) {
  useEffect(() => {
    document.title = title ? `${title} | Islami Express` : "Islami Express | Latest News, India, World & E-Paper";
    if (description) setMeta("description", description);
    if (title) setMeta("og:title", title, "property");
    if (description) setMeta("og:description", description, "property");
    if (image) setMeta("og:image", image, "property");
  }, [title, description, image]);
}
