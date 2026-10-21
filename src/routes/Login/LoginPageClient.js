"use client";

import Link from "next/link";
import LoginForm from "@/components/dashboard/LoginForm/LoginForm";
import LanguageSelect from "@/components/common/LanguageSelect/LanguageSelect";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/shared";
import "@/routes/Login/LoginPageClient.css";

const LOGIN_TITLES = { tr: "Giriş", en: "Login" };

export default function LoginPageClient({ turnstileSiteKey = "" }) {
  const { t } = useLanguage();

  return (
    <div className="login-shell" onDragStart={(e) => e.preventDefault()}>
      <DynamicTitle titles={LOGIN_TITLES} />
      <div className="login-topbar">
        <Link
          href="/"
          className="login-back"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/");
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> {t("login.backHome")}
        </Link>
        <LanguageSelect variant="solid" align="right" />
      </div>

      <div className="login-layout">
        <section className="login-side">
          <div className="login-logo">
            <img
              src="/assets/nebulon-logo.png"
              alt={t("login.brand")}
              width="1200"
              height="87"
              decoding="async"
              draggable="false"
            />
          </div>
          <h2>{t("login.badge")}</h2>
          <ul className="login-features">
            <li>
              <i className="fa-solid fa-bolt"></i> {t("login.featureFast")}
            </li>
            <li>
              <i className="fa-solid fa-shield-halved"></i> {t("login.featureSecure")}
            </li>
            <li>
              <i className="fa-solid fa-user-lock"></i> {t("login.featureRoles")}
            </li>
          </ul>
        </section>

        <section className="login-card">
          <span className="login-badge">{t("login.badge")}</span>
          <h1>{t("login.title")}</h1>
          <p>{t("login.subtitle")}</p>
          <LoginForm turnstileSiteKey={turnstileSiteKey} />
        </section>
      </div>
    </div>
  );
}
