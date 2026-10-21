"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/common/LanguageSelect/LanguageSelect.css";

export default function LanguageSelect({ variant = "default", align = "right" }) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = LOCALE_META[locale] || LOCALE_META.tr;

  useEffect(() => {
    if (!open) return;
    function onDocClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`lang-select lang-select-${variant}`} ref={rootRef}>
      <button
        type="button"
        className="lang-select-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.select")}
      >
        <img src={current.flag} alt="" width="20" height="20" data-locale={locale} />
        <span className="lang-select-label">{current.label}</span>
        <i className={`fa-solid fa-chevron-down lang-select-caret${open ? " open" : ""}`}></i>
      </button>
      <ul className={`lang-select-menu ${align}${open ? " open" : ""}`} role="listbox">
        {LOCALES.map((code) => {
          const meta = LOCALE_META[code];
          const active = code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`lang-select-option${active ? " active" : ""}`}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
              >
                <img src={meta.flag} alt="" width="20" height="20" data-locale={code} />
                <span>{meta.label}</span>
                {active && <i className="fa-solid fa-check"></i>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
