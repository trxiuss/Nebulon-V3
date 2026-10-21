"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import T from "@/components/common/T/T";
import "@/components/public/Header/Header.css";

const NAV_ITEMS = [
  { href: "/", key: "nav.home" },
  { href: "/projects", key: "nav.projects" },
  { href: "/team", key: "nav.team" },
  { href: "/contact", key: "nav.contact" }
];

const TOP_LEVEL_ROUTES = ["/", "/projects", "/team", "/contact", "/dashboard", "/login"];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/projects") {
    if (pathname === "/projects" || pathname.startsWith("/projects/")) return true;
    return !TOP_LEVEL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [notFoundPath, setNotFoundPath] = useState(null);
  const lastY = useRef(0);
  const headerRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      setNotFound(root.classList.contains("is-not-found"));
      setNotFoundPath(pathname);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    lastY.current = window.scrollY || 0;
    let ticking = false;
    let travel = 0;

    function onScroll() {
      const y = Math.max(0, window.scrollY || 0);
      const delta = y - lastY.current;
      lastY.current = y;
      ticking = false;

      if (y <= 160) {
        travel = 0;
        setHidden(false);
        return;
      }

      if (delta === 0) return;

      if (Math.sign(delta) !== Math.sign(travel)) travel = 0;

      travel += delta;

      if (travel > 36) {
        setHidden(true);
        setMenuOpen(false);
        travel = 0;
      } else if (travel < -24) {
        setHidden(false);
        travel = 0;
      }
    }

    function requestTick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }

    window.addEventListener("scroll", requestTick, { passive: true });

    return () => window.removeEventListener("scroll", requestTick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onDocClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);

    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login" || pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header ref={headerRef} className={hidden ? "hide" : ""}>
      <div className="header-container">
        <div className="logo">
          <Link href="/" aria-label="Nebulon Project">
            <img
              src="/assets/nebulon-logo.png"
              alt="Nebulon Project"
              width="1200"
              height="87"
              decoding="async"
              draggable="false" onContextMenu={(e) => e.preventDefault()}
            />
          </Link>
        </div>

        <nav className="desktop-menu" aria-label="Ana menü">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    notFoundPath === pathname &&
                    !notFound &&
                    isActive(pathname, item.href)
                      ? "active"
                      : ""
                  }
                >
                  <span>
                    <T k={item.key} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          className="mobile-menu-btn"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);

            if (!menuOpen) {
              setHidden(false);
            }
          }}
        >
          <i
            className={
              menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"
            }
          ></i>
        </button>
      </div>

      <div className={`mobile-dropdown${menuOpen ? " active" : ""}`}>
        <ul className="mobile-nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  notFoundPath === pathname &&
                  !notFound &&
                  isActive(pathname, item.href)
                    ? "active"
                    : ""
                }
              >
                <span>
                  <T k={item.key} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}