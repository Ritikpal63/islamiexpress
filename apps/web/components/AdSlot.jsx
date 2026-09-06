export default function AdSlot({
  label = "ADVERTISEMENT",
  size = "Responsive ad placement",
  compact = false,
}) {
  return (
    <aside
      className={`ad-slot ${compact ? "compact" : ""}`}
      aria-label="Advertisement"
    >
        <img
          src="./assets/ads/1.jpeg"
          alt="Advertisement"
          width={1280}
          height={120}
        />
        <img
          src="/assets/ads/1.jpeg"
          alt="Advertisement"
          width={1280}
          height={120}
        />
      {/* <small>{label}</small>
      <strong>{size}</strong> */}
    </aside>
  );
}
