"use client";

import Link from "next/link";
import Reveal from "@/components/public/Reveal/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/Button/Button.css";
import "@/components/public/CatCard/CatCard.css";

export default function CatCard({
  iconClass,
  colorClass,
  titleKey,
  descKey,
  title,
  description,
  href,
  delay
}) {
  const { t, locale } = useLanguage();

  const resolvedTitle = title
    ? locale === "tr"
      ? title.tr || title.en || ""
      : title.en || title.tr || ""
    : titleKey
      ? t(titleKey)
      : "";

  const resolvedDesc = description
    ? locale === "tr"
      ? description.tr || description.en || ""
      : description.en || description.tr || ""
    : descKey
      ? t(descKey)
      : "";

  return (
    <Reveal className="cat-card card-hover-target" delay={delay}>
      <div className={`cat-icon ${colorClass || ""}`}>
        <i className={iconClass || "fa-solid fa-folder"}></i>
      </div>
      <div className="cat-body">
        <h3>{resolvedTitle}</h3>
        {resolvedDesc ? <p>{resolvedDesc}</p> : null}
        {href ? (
          <Link href={href} className="btn-sm">
            <span>{t("cat.goList")}</span> <i className="fa-solid fa-arrow-right"></i>
          </Link>
        ) : (
          <span className="soon">{t("cat.soon")}</span>
        )}
      </div>
    </Reveal>
  );
}
