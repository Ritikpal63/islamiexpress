import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomBannerAd from "@/components/BottomBannerAd";
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Islami Express | Latest News, India, World & E-Paper",
    template: "%s | Islami Express",
  },
  description:
    "Islami Express brings breaking news, India and world updates, politics, business, sports, entertainment, opinion, videos and the daily e-paper.",
  openGraph: { siteName: "Islami Express", type: "website" },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <BottomBannerAd />
      </body>
    </html>
  );
}
