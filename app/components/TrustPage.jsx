export default function TrustPage({ eyebrow, title, children }) {
  return (
    <div className="container trust-page">
      <div className="page-heading">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="trust-copy">{children}</div>
    </div>
  );
}
