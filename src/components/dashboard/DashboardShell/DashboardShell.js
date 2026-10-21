"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LanguageSelect from "@/components/common/LanguageSelect/LanguageSelect";
import LogoutButton from "@/components/dashboard/LogoutButton/LogoutButton";
import { AdminConfirmProvider } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import PageTransition from "@/components/dashboard/PageTransition/PageTransition";
import useAdminPermissions from "@/components/dashboard/hooks/useAdminPermissions";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/shared";
import "@/components/dashboard/DashboardShell/DashboardShell.css";

const LINKS = [
  { href: "/dashboard", key: "admin.nav.overview", icon: "fa-solid fa-gauge-high", perm: null },
  { href: "/dashboard/categories", key: "admin.nav.categories", icon: "fa-solid fa-layer-group", perm: "categories.view" },
  { href: "/dashboard/products", key: "admin.nav.products", icon: "fa-solid fa-box-open", perm: "products.view" },
  { href: "/dashboard/team", key: "admin.nav.team", icon: "fa-solid fa-users", perm: "team.view" },
  { href: "/dashboard/contact", key: "admin.nav.contact", icon: "fa-solid fa-address-book", perm: "contact.view" },
  { href: "/dashboard/footer-icons", key: "admin.nav.footerIcons", icon: "fa-solid fa-icons", perm: "footer_icons.view" },
  { href: "/dashboard/users", key: "admin.nav.users", icon: "fa-solid fa-user-shield", perm: "users.view" },
  { href: "/dashboard/roles", key: "admin.nav.roles", icon: "fa-solid fa-user-tag", perm: "roles.view" },
  { href: "/dashboard/settings", key: "admin.nav.settings", icon: "fa-solid fa-gear", perm: "settings.view" },
  { href: "/dashboard/logs", key: "admin.nav.audit", icon: "fa-solid fa-clock-rotate-left", perm: ["audit.view", "audit.auth.view"] },
  { href: "/dashboard/account", key: "admin.nav.account", icon: "fa-solid fa-user-gear", perm: null }
];

function canAccess(permissions, perm) {
  if (!perm) return true;
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes("*")) return true;
  if (Array.isArray(perm)) return perm.some((item) => permissions.includes(item));
  return permissions.includes(perm);
}

function isActive(pathname, href) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export default function DashboardShell({ username, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const { permissions, stamp, epoch, loaded } = useAdminPermissions();
  const contentRef = useRef(null);
  const permissionSignature = useRef(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (!loaded) return;
    const signature = `${stamp}|${epoch}`;
    if (permissionSignature.current === null) {
      permissionSignature.current = signature;
      return;
    }
    if (permissionSignature.current === signature) return;
    permissionSignature.current = signature;
    router.refresh();
  }, [stamp, epoch, loaded, router]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const apply = (event) => {
      const desktop = event.matches;
      setIsDesktop(desktop);
      try {
        if (desktop) {
          setCollapsed(localStorage.getItem("nebulon_admin_sidebar") === "1");
          setMenuOpen(false);
        } else {
          setMenuOpen(localStorage.getItem("nebulon_admin_mobile_sidebar") === "1");
        }
      } catch (err) {
        if (desktop) setMenuOpen(false);
      }
    };
    apply(mq);
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (!isDesktop) {
      setMenuOpen(false);
      try {
        localStorage.setItem("nebulon_admin_mobile_sidebar", "0");
      } catch (err) {}
    }
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.classList.add("hover-ready");
    }
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    return () => root.classList.remove("hover-ready");
  }, []);

  function toggleMenu() {
    setMenuOpen((value) => {
      const next = !value;
      try {
        localStorage.setItem("nebulon_admin_mobile_sidebar", next ? "1" : "0");
      } catch (err) {}
      return next;
    });
  }

  function closeMenu() {
    setMenuOpen(false);
    try {
      localStorage.setItem("nebulon_admin_mobile_sidebar", "0");
    } catch (err) {}
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nebulon_admin_sidebar", next ? "1" : "0");
      } catch (err) {}
      return next;
    });
  }

  const links = LINKS.filter((link) => canAccess(permissions, link.perm));
  const activeLink = LINKS.find((link) => isActive(pathname, link.href)) || LINKS[0];
  const initials = (username || "A").slice(0, 2).toUpperCase();

  return (
    <div className={`admin-shell${collapsed && isDesktop ? " sidebar-collapsed" : ""}${menuOpen ? " menu-open" : ""}`}>
      <aside className={`admin-sidebar${menuOpen ? " open" : ""}`}>
        <div className="admin-logo">
          <button
            type="button"
            className="admin-brand-mark"
            onClick={() => collapsed && isDesktop && toggleCollapsed()}
            aria-label={collapsed && isDesktop ? t("admin.menu.open") : undefined}
            disabled={!collapsed || !isDesktop}
          >
            <i className="fa-solid fa-atom"></i>
          </button>
          <span className="admin-logo-text">{t("admin.panel")}</span>
          <button
            type="button"
            className="admin-collapse-btn"
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar"
          >
            <span className="admin-collapse-glyph" aria-hidden="true"><span /></span>
          </button>
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-nav-link${isActive(pathname, link.href) ? " active" : ""}`}
              title={t(link.key)}
            >
              <i className={link.icon}></i>
              <span className="admin-nav-label">{t(link.key)}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link href="/" className="admin-nav-link subtle" title={t("admin.nav.site")}>
            <i className="fa-solid fa-globe"></i>
            <span className="admin-nav-label">{t("admin.nav.site")}</span>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className={`admin-backdrop${menuOpen ? " open" : ""}`} onClick={closeMenu} />

      <div className="admin-content" ref={contentRef}>
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-btn"
              onClick={toggleMenu}
              aria-label={menuOpen ? t("admin.menu.close") : t("admin.menu.open")}
            >
              <i className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}></i>
            </button>
            <div className="admin-breadcrumb">
              <span>{t("admin.panel")}</span>
              <i className="fa-solid fa-chevron-right"></i>
              <strong>{activeLink ? t(activeLink.key) : ""}</strong>
            </div>
          </div>

          <div className="admin-topbar-right">
            <LanguageSelect variant="solid" align="right" />
            <div className="admin-user">
              <span className="admin-avatar">{initials}</span>
              <span className="admin-user-meta">
                <small>{t("admin.signedInAs")}</small>
                <strong>{username}</strong>
              </span>
            </div>
          </div>
        </header>

        <main className="admin-main"><AdminConfirmProvider><PageTransition>{children}</PageTransition></AdminConfirmProvider></main>
      </div>
    </div>
  );
}
