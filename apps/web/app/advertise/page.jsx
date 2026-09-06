import TrustPage from "@/components/TrustPage";
export const metadata = { title: "Advertise With Us" };
export default function Page() {
  return (
    <TrustPage eyebrow="ADVERTISING" title="Advertise With Islami Express">
      <p>
        The platform supports direct campaigns alongside Google advertising
        integrations, with desktop and mobile creatives, campaign dates,
        placements, impressions and clicks.
      </p>
      <h2>Available placements</h2>
      <p>
        Header leaderboard, homepage, category pages, article top/middle/bottom,
        sidebar and mobile placements are modeled in the CMS.
      </p>
      <h2>Sales contact</h2>
      <p>
        Add the newspaper's real advertising sales email and telephone number
        here before launch. Sponsored/editorial partnerships must be clearly
        disclosed.
      </p>
    </TrustPage>
  );
}
