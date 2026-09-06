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
      <small>{label}</small>
      <strong>{size}</strong>
    </aside>
  );
}
