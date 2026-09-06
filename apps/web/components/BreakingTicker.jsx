import Link from "next/link";
export default function BreakingTicker({ items = [] }) {
  const news = items.length
    ? items
    : [
        {
          slug: "welcome-to-islamiexpress",
          title:
            "Islami Express digital newsroom is ready for breaking news and live updates",
        },
      ];
  return (
    <div className="breaking">
      <div className="container breaking-inner">
        <strong>
          <i /> BREAKING
        </strong>
        <div className="ticker">
          <div>
            {[...news, ...news].map((n, i) => (
              <Link key={i} href={`/article/${n.slug}`}>
                {n.title}
                <span>•</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
