"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/LogoutButton/LogoutButton.css";

export default function LogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      setLoading(false);
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className="admin-logout" onClick={handleLogout} disabled={loading}>
      <i className={loading ? "fa-solid fa-circle-notch fa-spin" : "fa-solid fa-arrow-right-from-bracket"}></i>
      <span className="admin-nav-label">{t("admin.logout")}</span>
    </button>
  );
}
