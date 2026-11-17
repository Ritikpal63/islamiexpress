export default function ProfileAvatar({ name, imageUrl, className = "" }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  return (
    <div
      className={`avatar ${className}`.trim()}
      role="img"
      aria-label={imageUrl ? `${name || "User"}'s profile photo` : `${name || "User"}'s profile initial`}
    >
      {imageUrl ? <img src={imageUrl} alt="" /> : initial}
    </div>
  );
}
