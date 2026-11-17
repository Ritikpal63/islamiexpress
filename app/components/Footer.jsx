import { Link } from "react-router-dom";
import Newsletter from "./Newsletter";
export default function Footer() {
  return <footer>
    <div className="container footer-grid">
      <div><div className="footer-brand"><span>ISLAMI</span> EXPRESS</div><p>Independent daily journalism for web and print. Breaking news, explainers, opinion, video and the daily e-paper.</p>
        <address className="footer-contact"><h4>Contact Details</h4><p><strong>Editor-in-Chief:</strong> Mirza Mehtab Beg</p><p><strong>Website:</strong> <a href="http://www.islamiexpress.com">www.islamiexpress.com</a></p><p><strong>Email:</strong> <a href="mailto:islamiexpressnews@gmail.com">islamiexpressnews@gmail.com</a></p><p><strong>Phone:</strong> <a href="tel:+919313326351">+91 93133 26351</a></p></address>
      </div>
      <div><h4>News</h4><Link to="/latest">Latest</Link><Link to="/category/india">India</Link><Link to="/category/world">World</Link><Link to="/category/sports">Sports</Link><Link to="/category/business">Business</Link></div>
      <div><h4>Company</h4><Link to="/about">About Us</Link><Link to="/editorial-policy">Editorial Policy</Link><Link to="/corrections-policy">Corrections Policy</Link><Link to="/advertise">Advertise With Us</Link><Link to="/contact">Contact</Link></div>
      <Newsletter/>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} OnetoZServices. All rights reserved.</span><span><Link to="/privacy">Privacy</Link> • Terms • Cookie Policy</span></div>
  </footer>;
}
