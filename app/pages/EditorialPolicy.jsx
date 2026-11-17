import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function EditorialPolicy() {
  usePageMeta({ title: "Editorial Policy" });
  return (
    <TrustPage eyebrow="TRUST & TRANSPARENCY" title="Editorial Policy">
      <h2>Accuracy and verification</h2>
      <p>Material facts should be verified before publication and information from third parties should be attributed to its source.</p>
      <h2>News, opinion and sponsored content</h2>
      <p>Opinion, analysis and sponsored material should be identified clearly so readers can distinguish them from news reporting.</p>
      <h2>Corrections</h2>
      <p>Material errors should be corrected promptly and significant updates should be disclosed on the relevant story.</p>
    </TrustPage>
  );
}
