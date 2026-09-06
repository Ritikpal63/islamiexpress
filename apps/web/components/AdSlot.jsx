"use client";

export default function AdSlot({
  label = "ADVERTISEMENT",
  image,
  link = "#",
  alt = "Advertisement",
  size = "Responsive ad placement",
  compact = true,
  style = {},
}) {
  if (!image) {
    return (
      <aside
        className={`ad-slot ${compact ? "compact" : ""}`}
        aria-label="Advertisement"
      >
        <small>{label}</small>
        <strong>{size}</strong>
      </aside>
    );
  }

  return (
    <aside
      className={`ad-slot ad-slot--image ${compact ? "compact" : ""}`}
      aria-label="Advertisement"
    >
      <a href={link} target="_blank" rel="noopener noreferrer sponsored">
        <img
          src={image}
          alt={alt}
          style={{ ...style, maxWidth: "100%", height: "auto" }}
          className="top-banner"
        />
      </a>
    </aside>
  );
}
