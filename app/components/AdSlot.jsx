import useAd, { trackAdEvent } from "@/hooks/useAd";

export default function AdSlot({
  label = "ADVERTISEMENT",
  image,
  position,
  fallbackPosition,
  link,
  alt = "Advertisement",
  compact = true,
  style = {},
}) {
  const ad = useAd(position, fallbackPosition);
  const creativeUrl = ad?.creative_url || (position ? null : image);
  if (!creativeUrl) return null;

  const creative = (
    <img
      src={creativeUrl}
      alt={alt}
      style={{ ...style, maxWidth: "100%", height: "auto" }}
      className="top-banner"
      loading="eager"
      decoding="async"
    />
  );

  return (
    <aside
      className={`ad-slot ad-slot--image ${compact ? "compact" : ""}`}
      aria-label={label}
    >
      {ad?.target_url || link ? (
        <a href={ad?.target_url || link} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAdEvent(ad?.id, "click")}>
          {creative}
        </a>
      ) : (
        creative
      )}
    </aside>
  );
}
