import { Link } from "react-router-dom";

export default function BreakingTicker({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="breaking">
      <div className="container breaking-inner">
        <strong><i /> BREAKING</strong>
        <div className="ticker">
          <div>
            {[...items, ...items].map((item, index) => (
              <Link key={`${item.id || item.slug}-${index}`} to={`/article/${item.slug}`}>
                {item.title}<span>•</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
