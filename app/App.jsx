import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomBannerAd from "@/components/BottomBannerAd";
import Home from "@/pages/Home";
import Latest from "@/pages/Latest";
import Category from "@/pages/Category";
import Article from "@/pages/Article";
import Author from "@/pages/Author";
import Search from "@/pages/Search";
import Saved from "@/pages/Saved";
import Epaper from "@/pages/Epaper";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import EditorialPolicy from "@/pages/EditorialPolicy";
import CorrectionsPolicy from "@/pages/CorrectionsPolicy";
import Advertise from "@/pages/Advertise";
import Privacy from "@/pages/Privacy";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminArticles from "@/pages/admin/AdminArticles";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminComments from "@/pages/admin/AdminComments";
import AdminAds from "@/pages/admin/AdminAds";
import AdminUsers from "@/pages/admin/AdminUsers";
import NotFound from "@/pages/NotFound";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView());
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return <>
    <ScrollManager/>
    <Header/>
    <main>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/latest" element={<Latest/>}/>
        <Route path="/category/:slug" element={<Category/>}/>
        <Route path="/article/:slug" element={<Article/>}/>
        <Route path="/author/:id" element={<Author/>}/>
        <Route path="/search" element={<Search/>}/>
        <Route path="/saved" element={<Saved/>}/>
        <Route path="/epaper" element={<Epaper/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/about" element={<About/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/editorial-policy" element={<EditorialPolicy/>}/>
        <Route path="/corrections-policy" element={<CorrectionsPolicy/>}/>
        <Route path="/advertise" element={<Advertise/>}/>
        <Route path="/privacy" element={<Privacy/>}/>
        <Route path="/admin" element={<AdminDashboard/>}/>
        <Route path="/admin/articles" element={<AdminArticles/>}/>
        <Route path="/admin/categories" element={<AdminCategories/>}/>
        <Route path="/admin/comments" element={<AdminComments/>}/>
        <Route path="/admin/ads" element={<AdminAds/>}/>
        <Route path="/admin/users" element={<AdminUsers/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </main>
    <Footer/>
    <BottomBannerAd/>
  </>;
}
