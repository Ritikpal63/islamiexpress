import Link from "next/link";
import Newsletter from "./Newsletter";
export default function Footer() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <span>ISLAMI</span> EXPRESS
          </div>
          <p>
            Independent daily journalism for web and print. Breaking news,
            explainers, opinion, video and the daily e-paper.
          </p>
        </div>
        <div>
          <h4>News</h4>
          <Link href="/latest">Latest</Link>
          <Link href="/category/india">India</Link>
          <Link href="/category/world">World</Link>
          <Link href="/category/sports">Sports</Link>
          <Link href="/category/business">Business</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link href="/about">About Us</Link>
          <Link href="/editorial-policy">Editorial Policy</Link>
          <Link href="/corrections-policy">Corrections Policy</Link>
          <Link href="/advertise">Advertise With Us</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <Newsletter />
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Islami Express. All rights reserved.
        </span>
        <span>
          <Link href="/privacy">Privacy</Link> • Terms • Cookie Policy
        </span>
      </div>
    </footer>
  );
}
