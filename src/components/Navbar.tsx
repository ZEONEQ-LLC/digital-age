"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AUTHOR_SUITE_PATHS = [
  "/autor/dashboard",
  "/autor/artikel",
  "/autor/statistiken",
  "/autor/podcasts",
  "/autor/prompts",
  "/autor/profil",
  "/autor/admin",
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const isAuthorSuite = AUTHOR_SUITE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isAuthorSuite) return null;

  return (
    <>
      <style>{`
        .nav-root { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: var(--da-dark); border-bottom: 1px solid var(--da-card); }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .nav-logo img { height: 40px; width: auto; display: block; }
        .nav-desktop { display: flex; align-items: center; gap: 32px; }
        .nav-desktop a { color: var(--da-text-strong); text-decoration: none; font-size: 15px; }
        .nav-desktop a:hover { color: var(--da-green); }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-lang { color: var(--da-muted); font-size: 14px; cursor: pointer; background: none; border: none; }
        .nav-cta { background: var(--da-green); color: var(--da-dark); font-size: 15px; font-weight: 700; padding: 10px 20px; border-radius: 4px; text-decoration: none; }
        .nav-hamburger { display: none; background: none; border: none; color: var(--da-text); cursor: pointer; padding: 4px; }
        .nav-dropdown { position: relative; }
        .nav-dropdown-btn { color: var(--da-text-strong); font-size: 15px; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .nav-dropdown-btn:hover { color: var(--da-green); }
        .nav-dropdown-menu { position: absolute; top: calc(100% + 12px); left: 0; background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px; min-width: 180px; overflow: hidden; }
        .nav-dropdown-menu a { display: block; padding: 12px 16px; color: var(--da-text-strong); text-decoration: none; font-size: 14px; }
        .nav-dropdown-menu a:hover { background: var(--da-border); color: var(--da-green); }
        .mobile-menu { display: none; flex-direction: column; background: var(--da-dark); border-top: 1px solid var(--da-card); padding: 16px 24px 24px; gap: 0; }
        .mobile-menu.open { display: flex; }
        .mobile-link { color: var(--da-text); text-decoration: none; font-size: 16px; font-weight: 500; padding: 14px 0; border-bottom: 1px solid var(--da-card); display: block; }
        .mobile-sublabel { color: var(--da-muted); font-size: 13px; padding: 8px 0 8px 12px; display: block; text-decoration: none; }
        .mobile-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; margin-top: 8px; }
        @media (max-width: 768px) {
          .nav-desktop { display: none; }
          .nav-right { display: none; }
          .nav-hamburger { display: block; }
        }
      `}</style>

      <nav className="nav-root">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <Image src="/images/digital age Logo green dark bg.png" alt="digital age" width={420} height={260} priority />
          </Link>
          <div className="nav-desktop">
            <Link href="/ki-im-business">KI & Business</Link>
            <Link href="/future-tech">Future Tech</Link>
            <Link href="/swiss-ai" style={{ color: "var(--da-green)", fontWeight: 600 }}>🇨🇭 Swiss AI</Link>
            <div className="nav-dropdown">
              <button className="nav-dropdown-btn" onClick={() => setToolsOpen(!toolsOpen)}>
                Tools & Ressources
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              {toolsOpen && (
                <div className="nav-dropdown-menu">
                  <Link href="/ki-plattformen" onClick={() => setToolsOpen(false)}>KI-Plattformen</Link>
                  <Link href="/ai-prompts" onClick={() => setToolsOpen(false)}>GenAI Prompts</Link>
                  <Link href="/podcasts" onClick={() => setToolsOpen(false)}>Podcasts</Link>
                </div>
              )}
            </div>
          </div>
          <div className="nav-right">
            <Link href="/newsletter" style={{ color: "var(--da-text-strong)", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>📬 Newsletter</Link>
            <Link href="/login" style={{ color: "var(--da-text-strong)", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Login</Link>
            <button className="nav-lang">DE / EN</button>
            <Link href="/artikel-pitchen" className="nav-cta">Publizieren</Link>
          </div>
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menü"
          >
            {menuOpen
              ? <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: "fixed",
          top: "64px",
          left: 0,
          right: 0,
          zIndex: 199,
          backgroundColor: "var(--da-dark)",
          borderTop: "1px solid var(--da-card)",
          padding: "16px 24px 24px",
          display: "flex",
          flexDirection: "column",
        }}>
          <Link href="/ki-im-business" style={{ color: "var(--da-text)", textDecoration: "none", fontSize: "16px", fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }} onClick={() => setMenuOpen(false)}>KI & Business</Link>
          <Link href="/future-tech" style={{ color: "var(--da-text)", textDecoration: "none", fontSize: "16px", fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }} onClick={() => setMenuOpen(false)}>Future Tech</Link>
          <Link href="/swiss-ai" style={{ color: "var(--da-green)", textDecoration: "none", fontSize: "16px", fontWeight: 600, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }} onClick={() => setMenuOpen(false)}>🇨🇭 Swiss AI</Link>
          <Link href="/login" style={{ color: "var(--da-text)", textDecoration: "none", fontSize: "16px", fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }} onClick={() => setMenuOpen(false)}>Login</Link>
          <Link href="/newsletter" style={{ color: "var(--da-text)", textDecoration: "none", fontSize: "16px", fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }} onClick={() => setMenuOpen(false)}>📬 Newsletter</Link>
          <span style={{ color: "var(--da-muted)", fontSize: "14px", fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--da-card)", display: "block" }}>Tools & Ressources</span>
          <Link href="/ki-plattformen" style={{ color: "var(--da-muted)", fontSize: "13px", padding: "8px 0 8px 12px", display: "block", textDecoration: "none" }} onClick={() => setMenuOpen(false)}>KI-Plattformen</Link>
          <Link href="/ai-prompts" style={{ color: "var(--da-muted)", fontSize: "13px", padding: "8px 0 8px 12px", display: "block", textDecoration: "none" }} onClick={() => setMenuOpen(false)}>GenAI Prompts</Link>
          <Link href="/podcasts" style={{ color: "var(--da-muted)", fontSize: "13px", padding: "8px 0 8px 12px", display: "block", textDecoration: "none" }} onClick={() => setMenuOpen(false)}>Podcasts</Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", marginTop: "8px" }}>
            <button className="nav-lang">DE / EN</button>
            <Link href="/artikel-pitchen" className="nav-cta" onClick={() => setMenuOpen(false)}>Publizieren</Link>
          </div>
        </div>
      )}
    </>
  );
}
