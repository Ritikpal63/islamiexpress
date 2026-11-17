import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function Advertise() {
  usePageMeta({ title: "Advertise With Us" });
  return (
    <TrustPage eyebrow="ADVERTISING" title="Advertise With Islami Express">
      <p>Advertising placements are available across the website, including header, homepage, category, article and sidebar positions.</p>
      <h2>Advertising enquiries</h2>
      <p><a href="mailto:islamiexpressnews@gmail.com">islamiexpressnews@gmail.com</a><br/><a href="tel:+919313326351">+91 93133 26351</a></p>
    </TrustPage>
  );
}
