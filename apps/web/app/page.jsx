import Link from "next/link";
import Image from "next/image";
import { Play, TrendingUp, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { demoArticles, fallbackImage } from "@/lib/mock";
import BreakingTicker from "@/components/BreakingTicker";
import NewsCard from "@/components/NewsCard";
import Section from "@/components/Section";
import AdSlot from "@/components/AdSlot";

export const revalidate = 60;
async function list(query = "") {
  const d = await apiFetch(`/articles?limit=12${query}`);
  return d?.data?.length ? d.data : demoArticles;
}
export default async function Home() {
  const [all, breaking, trending] = await Promise.all([
    list(),
    list("&type=breaking"),
    apiFetch("/articles/trending?limit=6"),
  ]);
  const trend = trending?.data?.length ? trending.data : demoArticles.slice(1);
  const lead = all[0];
  const side = all.slice(1, 5);
  const groups = {
    India: all.filter((x) => x.category_slug === "india"),
    Politics: all.filter((x) => x.category_slug === "politics"),
    Business: all.filter((x) => x.category_slug === "business"),
    Sports: all.filter((x) => x.category_slug === "sports"),
    Entertainment: all.filter((x) => x.category_slug === "entertainment"),
  };
  return (
    <>
      <BreakingTicker items={breaking.slice(0, 5)} />
      <div className="container">
        <AdSlot
          image="/assets/ads/3.jpeg"
          style={{ width: "1280px", height: "250px" }}
        />
        <section className="hero-grid">
          <article className="lead-story">
            <Link href={`/article/${lead.slug}`}>
              <div className="lead-image">
                <Image
                  src={lead.featured_image || fallbackImage}
                  alt={lead.title}
                  fill
                  priority
                  sizes="(max-width:900px) 100vw, 60vw"
                />
              </div>
              <span className="breaking-pill">TOP STORY</span>
              <h1>{lead.title}</h1>
              <p>{lead.summary}</p>
            </Link>
          </article>
          <div className="side-stories">
            {side.map((a, i) => (
              <NewsCard article={a} variant="compact" key={a.id || i} />
            ))}
          </div>
          <aside className="trending-box">
            <div className="trending-title">
              <TrendingUp /> Trending
            </div>
            {trend.slice(0, 6).map((a, i) => (
              <Link key={a.id || i} href={`/article/${a.slug}`}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{a.title}</span>
              </Link>
            ))}
          </aside>
        </section>
        <div className="two-col">
          <div>
            <section className="news-section">
              <div className="section-title">
                <h2>Latest News</h2>
                <Link href="/latest">View all →</Link>
              </div>
              <div className="card-grid">
                {all.slice(0, 4).map((a, i) => (
                  <NewsCard key={a.id || i} article={a} />
                ))}
              </div>
            </section>
            <AdSlot
              image="/assets/ads/4.jpeg"
              style={{ width: "930px", height: "250px" }}
            />
            <Section
              title="India"
              slug="india"
              articles={groups.India.length ? groups.India : all.slice(1, 5)}
            />
            <Section
              title="Politics"
              slug="politics"
              articles={
                groups.Politics.length ? groups.Politics : all.slice(2, 6)
              }
            />
            <AdSlot
              compact
              size="300 × 250"
              image="/assets/ads/5.jpeg"
              style={{ width: "920px", height: "240px" }}
            />
            <Section
              title="Business"
              slug="business"
              articles={
                groups.Business.length ? groups.Business : all.slice(0, 4)
              }
            />
            <Section
              title="Sports"
              slug="sports"
              articles={groups.Sports.length ? groups.Sports : all.slice(2, 6)}
            />
            <Section
              title="Entertainment"
              slug="entertainment"
              articles={
                groups.Entertainment.length
                  ? groups.Entertainment
                  : all.slice(1, 5)
              }
            />
          </div>
          <aside className="home-sidebar">
            <AdSlot
              compact
              size="300 × 250"
              image="/assets/ads/banner1.jpeg"
              style={{ height: "270px", width: "320px" }}
            />
            <div className="editors-pick">
              <h3>Editor’s Picks</h3>
              {all.slice(0, 5).map((a, i) => (
                <Link href={`/article/${a.slug}`} key={a.id || i}>
                  <span>{i + 1}</span>
                  {a.title}
                  <ChevronRight />
                </Link>
              ))}
            </div>
            <div className="video-promo">
              <Play />
              <small>VIDEO</small>
              <h3>Watch the latest reports, interviews and explainers</h3>
              <Link href="/category/videos">Watch now →</Link>
            </div>
            <AdSlot
              compact
              size="300 × 250"
              image="/assets/ads/banner2.jpeg"
              style={{ height: "270px", width: "320px" }}
            />
          </aside>
        </div>
        <section className="epaper-promo">
          <div>
            <small>TODAY'S NEWSPAPER</small>
            <h2>Read Islami Express E-Paper</h2>
            <p>
              Access the complete print edition online and browse previous
              issues from the archive.
            </p>
            <Link href="/epaper">
              Open E-Paper <ChevronRight />
            </Link>
          </div>
          <div className="paper-stack">
            <div className="paper">
              ISLAMI <b>EXPRESS</b>
              <span>DAILY E-PAPER</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
