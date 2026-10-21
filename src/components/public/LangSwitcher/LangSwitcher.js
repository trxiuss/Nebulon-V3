"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/LangSwitcher/LangSwitcher.css";

export default function LangSwitcher() {
  const pathname = usePathname();
  const { locale, setLocale } = useLanguage();

  if (pathname === "/login" || pathname.startsWith("/dashboard")) return null;

  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-btn lang-btn-tr${locale === "tr" ? " active" : ""}`}
        title="T\u00fcrk\u00e7e"
        aria-label="T\u00fcrk\u00e7e"
        onClick={() => setLocale("tr")}
      >
        <img src="https://flagcdn.com/w80/tr.png" alt="TR" width="36" height="36" loading="lazy" />
      </button>
      <button
        type="button"
        className={`lang-btn${locale === "en" ? " active" : ""}`}
        title="English"
        aria-label="English"
        onClick={() => setLocale("en")}
      >
        <img src="https://flagcdn.com/w80/gb.png" alt="EN" width="36" height="36" loading="lazy" />
      </button>
    </div>
  );
}
