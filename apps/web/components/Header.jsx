"use client";
import Link from "next/link";
import { Menu, Search, User, Newspaper, X } from "lucide-react";
import { useState } from "react";

const nav = [
  ["Latest", "/latest"],
  ["India", "/category/india"],
  ["World", "/category/world"],
  ["Politics", "/category/politics"],
  ["Business", "/category/business"],
  ["Sports", "/category/sports"],
  ["Entertainment", "/category/entertainment"],
  ["Technology", "/category/technology"],
  ["Health", "/category/health"],
  ["Opinion", "/category/opinion"],
  ["Fact Check", "/category/fact-check"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
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
            <Link href="/epaper">
              <Newspaper size={14} /> E-Paper
            </Link>
            <Link href="/saved">Saved</Link>
            <Link href="/login">
              <User size={14} /> Login
            </Link>
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
          <Link href="/" className="brand">
            <span>ISLAMI</span> EXPRESS<small>NEWS • VIEWS • E-PAPER</small>
          </Link>
          <div className="header-ad">
            {/* <span>ADVERTISEMENT</span>
            <b>970 × 90</b> */}
            <img src="./assets/ads/1.jpeg" alt="Advertisement" width={900} height={90} />
          </div>
          <button
            className="icon-btn"
            onClick={() => setSearch((v) => !v)}
            aria-label="Search"
          >
            <Search />
          </button>
        </div>
        {search && (
          <form className="container searchbar" action="/search">
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
            <Link href="/" className="home-link">
              Home
            </Link>
            {nav.map(([n, h]) => (
              <Link key={n} href={h}>
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
          <Link onClick={() => setOpen(false)} key={n} href={h}>
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
