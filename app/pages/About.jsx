import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function About() {
  usePageMeta({ title: "About Us" });
  return (
    <TrustPage eyebrow="ABOUT THE PUBLICATION" title="About Islami Express">
      <p>Islami Express is a print and digital news publication providing news and public-interest coverage across its web and print editions.</p>
    </TrustPage>
  );
}
