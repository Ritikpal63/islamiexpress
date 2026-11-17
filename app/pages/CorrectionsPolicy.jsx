import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function CorrectionsPolicy() {
  usePageMeta({ title: "Corrections Policy" });
  return (
    <TrustPage eyebrow="ACCOUNTABILITY" title="Corrections Policy">
      <p>When a material error is confirmed, Islami Express will correct the affected story and may add a correction or update note where appropriate.</p>
      <h2>Request a correction</h2>
      <p>Email <a href="mailto:islamiexpressnews@gmail.com">islamiexpressnews@gmail.com</a> with the article URL, the information you believe is incorrect and any supporting evidence.</p>
    </TrustPage>
  );
}
