"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/AccessDenied/AccessDenied.css";

export default function AccessDenied() {
  const { t } = useLanguage();

  return (
    <section className="admin-access-denied" aria-labelledby="access-denied-title">
      <span className="admin-access-denied-icon" aria-hidden="true">
        <i className="fa-solid fa-lock" />
      </span>
      <div>
        <h1 id="access-denied-title">{t("admin.accessDenied.title")}</h1>
        <p>{t("admin.accessDenied.message")}</p>
      </div>
      <Link href="/dashboard" className="admin-btn primary">
        <i className="fa-solid fa-arrow-left" />
        {t("admin.accessDenied.back")}
      </Link>
    </section>
  );
}
