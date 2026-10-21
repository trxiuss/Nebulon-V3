"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { SEO_DEFAULT_LOCALE, SITE_NAME } from "@/lib/seo-client";

export default function DynamicTitle({ titles, suffix = true }) {
  const { locale } = useLanguage();

  useEffect(() => {
    if (!titles) return;
    const value = titles[locale] || titles[SEO_DEFAULT_LOCALE] || titles.en || "";
    if (!value) return;
    const full =
      suffix && !value.includes(SITE_NAME) ? `${value} | ${SITE_NAME}` : value;
    document.title = full;
  }, [titles, locale, suffix]);

  return null;
}
