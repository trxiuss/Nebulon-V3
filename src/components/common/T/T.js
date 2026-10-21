"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function T({ k }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
