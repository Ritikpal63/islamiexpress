import TrustPage from "@/components/TrustPage";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return (
    <TrustPage eyebrow="LEGAL" title="Privacy Policy">
      <p>
        This is a placeholder for a lawyer-reviewed privacy policy. Before
        production, document what data is collected for accounts, comments,
        analytics, advertising, newsletters, push notifications and security
        logs; identify retention periods and user rights; and configure consent
        where legally required.
      </p>
    </TrustPage>
  );
}
