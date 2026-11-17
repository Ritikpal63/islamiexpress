import TrustPage from "@/components/TrustPage";
import usePageMeta from "@/hooks/usePageMeta";

export default function Contact() {
  usePageMeta({ title: "Contact Us" });
  return (
    <TrustPage eyebrow="CONTACT" title="Contact Islami Express">
      <div className="contact-grid">
        <div><h3>Email</h3><p><a href="mailto:islamiexpressnews@gmail.com">islamiexpressnews@gmail.com</a></p></div>
        <div><h3>Phone</h3><p><a href="tel:+919313326351">+91 93133 26351</a></p></div>
        <div><h3>Website</h3><p><a href="https://www.islamiexpress.com" target="_blank" rel="noreferrer">www.islamiexpress.com</a></p></div>
      </div>
    </TrustPage>
  );
}
