"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/DashboardOverview/DashboardOverview.css";

const CARDS = [
  { key: "categories", label: "admin.overview.categories", icon: "fa-solid fa-layer-group", href: "/dashboard/categories" },
  { key: "products", label: "admin.overview.products", icon: "fa-solid fa-box-open", href: "/dashboard/products" },
  { key: "team", label: "admin.overview.team", icon: "fa-solid fa-users", href: "/dashboard/team" },
  { key: "users", label: "admin.overview.users", icon: "fa-solid fa-user-shield", href: "/dashboard/users" },
  { key: "earnings", label: "admin.overview.earnings", icon: "fa-solid fa-sack-dollar", href: null }
];

const ACTIONS = [
  { label: "admin.overview.addProduct", icon: "fa-solid fa-plus", href: "/dashboard/products" },
  { label: "admin.overview.addCategory", icon: "fa-solid fa-plus", href: "/dashboard/categories" },
  { label: "admin.overview.addTeam", icon: "fa-solid fa-plus", href: "/dashboard/team" },
  { label: "admin.overview.addUser", icon: "fa-solid fa-plus", href: "/dashboard/users" },
  { label: "admin.overview.addContact", icon: "fa-solid fa-plus", href: "/dashboard/contact" },
  { label: "admin.overview.addFooterIcon", icon: "fa-solid fa-plus", href: "/dashboard/footer-icons" },
  { label: "admin.overview.addRole", icon: "fa-solid fa-plus", href: "/dashboard/roles" },
  { label: "admin.overview.openSettings", icon: "fa-solid fa-plus", href: "/dashboard/settings" }
];

export default function DashboardOverview({ stats, latestProducts, latestTeam }) {
  const { t, locale } = useLanguage();
  const pick = (tr, en) => (locale === "en" ? en || tr : tr);

  function productImage(product) {
    if (product.image_type === "url" && product.image_value) return product.image_value;
    return null;
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.overview.title")}</h1>
          <p>{t("admin.overview.subtitle")}</p>
        </div>
      </div>

      <div className="admin-grid">
        {CARDS.map((card) => {
          const body = (
            <>
              <span className="admin-stat-icon">
                <i className={card.icon}></i>
              </span>
              <span className="admin-stat-body">
                <small>{t(card.label)}</small>
                <strong>{stats[card.key] ?? 0}</strong>
              </span>
            </>
          );
          if (!card.href) {
            return (
              <div key={card.key} className="admin-stat overview-card">
                {body}
              </div>
            );
          }
          return (
            <Link key={card.key} href={card.href} className="admin-stat overview-card">
              {body}
            </Link>
          );
        })}
      </div>

      <div className="admin-columns">
        <div className={`admin-card overview-card admin-recent-card${latestProducts.length === 0 ? " empty" : ""}`}>
          <div className="admin-card-head">
            <h2>{t("admin.overview.latestProducts")}</h2>
            <Link href="/dashboard/products" className="admin-btn ghost small">
              {t("admin.nav.products")}
            </Link>
          </div>
          {latestProducts.length === 0 ? (
            <div className="admin-empty">{t("admin.overview.empty")}</div>
          ) : (
            <ul className="admin-list">
              {latestProducts.map((product) => (
                <li key={product.id}>
                  {productImage(product) ? (
                    <img src={productImage(product)} alt="" className="admin-thumb" />
                  ) : (
                    <span className="admin-thumb placeholder">
                      <i className="fa-solid fa-box"></i>
                    </span>
                  )}
                  <span className="admin-list-body">
                    <strong>{pick(product.title_tr, product.title_en)}</strong>
                    <small>{pick(product.category_tr, product.category_en) || t("admin.products.uncategorized")}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`admin-card overview-card admin-recent-card${latestTeam.length === 0 ? " empty" : ""}`}>
          <div className="admin-card-head">
            <h2>{t("admin.overview.latestTeam")}</h2>
            <Link href="/dashboard/team" className="admin-btn ghost small">
              {t("admin.nav.team")}
            </Link>
          </div>
          {latestTeam.length === 0 ? (
            <div className="admin-empty">{t("admin.overview.empty")}</div>
          ) : (
            <ul className="admin-list">
              {latestTeam.map((member) => (
                <li key={member.id}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="admin-thumb round" />
                  ) : (
                    <span className="admin-thumb round placeholder">
                      <i className="fa-solid fa-user"></i>
                    </span>
                  )}
                  <span className="admin-list-body">
                    <strong>{member.name}</strong>
                    <small>{pick(member.role_tr, member.role_en) || "-"}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-card overview-card">
        <div className="admin-card-head">
          <h2>{t("admin.overview.quickActions")}</h2>
        </div>
        <div className="admin-actions">
          {ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} className="admin-action">
              <i className={action.icon}></i>
              <span>{t(action.label)}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
