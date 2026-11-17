import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function Privacy() {
  usePageMeta({ title: "Privacy Policy" });
  return (
    <TrustPage eyebrow="LEGAL" title="Privacy Policy">
      <p>Islami Express may process information that readers submit through account, comment, newsletter and contact features, together with technical information required to operate and secure the website.</p>
      <p>Advertising and analytics services may use cookies or similar technologies where enabled. Readers can contact Islami Express at <a href="mailto:islamiexpressnews@gmail.com">islamiexpressnews@gmail.com</a> for privacy-related enquiries.</p>
    </TrustPage>
  );
}
