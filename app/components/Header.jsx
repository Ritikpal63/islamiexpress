import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Newspaper, X } from "lucide-react";
import { useState } from "react";
import AdSlot from "./AdSlot";
import LanguageTranslator from "./LanguageTranslator";
import AccountMenu from "./AccountMenu";

const nav = [
  ["Latest", "/latest"],
  ["India", "/category/india"],
  ["World", "/category/world"],
  ["Delhi", "/category/delhi"],
  ["Politics", "/category/politics"],
  ["Sports", "/category/sports"],
  ["Entertainment", "/category/entertainment"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const navigate = useNavigate();

  function submitSearch(event) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") || "").trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setSearch(false);
  }

  return (
    <>
      <div className="utility">
        <div className="container utility-inner">
          <span>
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(
              new Date(),
            )}
          </span>
          <div>
            <LanguageTranslator />
            <Link to="/epaper">
              <Newspaper size={14} /> E-Paper
            </Link>
            <Link to="/saved">Saved</Link>
            <AccountMenu />
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="container brand-row">
          <button
            className="icon-btn mobile"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <Link to="/" className="brand">
            <img
              src="/assets/logo/logoislamiexpress.png"
              alt="Islami Express"
              width={200}
              height={100}
            />
          </Link>
          <AdSlot position="HEADER_LEADERBOARD" />
          <button
            className="icon-btn"
            onClick={() => setSearch((v) => !v)}
            aria-label="Search"
          >
            <Search />
          </button>
        </div>
        {search && (
          <form className="container searchbar" onSubmit={submitSearch}>
            <input
              autoFocus
              name="q"
              placeholder="Search news, topics and people..."
            />
            <button>Search</button>
          </form>
        )}
        <nav className="main-nav">
          <div className="container nav-scroll">
            <Link to="/" className="home-link">
              Home
            </Link>
            {nav.map(([n, h]) => (
              <Link key={n} to={h}>
                {n}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <div className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-head">
          <b>ISLAMI EXPRESS</b>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        {[
          ["Home", "/"],
          ...nav,
          ["E-Paper", "/epaper"],
          ["Saved News", "/saved"],
        ].map(([n, h]) => (
          <Link onClick={() => setOpen(false)} key={n} to={h}>
            {n}
          </Link>
        ))}
      </div>
      {open && (
        <button
          className="backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
