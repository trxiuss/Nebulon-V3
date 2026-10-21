"use client";

import Reveal from "@/components/public/Reveal/Reveal";
import CatCard from "@/components/public/CatCard/CatCard";
import { useLanguage } from "@/context/LanguageContext";
import "@/routes/shared/PageLayout.css";
import "@/routes/Projects/ProjectsPageClient.css";
import "@/components/public/Reveal/Reveal.css";

export default function ProjectsPageClient({ categories = [] }) {
  const { t } = useLanguage();
  const list = Array.isArray(categories) ? categories : [];

  return (
    <>
      <Reveal as="div" className="page-head">
        <h1>{t("projects.title")}</h1>
        <p>{t("projects.sub")}</p>
      </Reveal>

      <div className="page-body">
        {list.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-folder-open"></i>
            <h3>{t("projects.noCategoriesTitle")}</h3>
            <p>{t("projects.noCategoriesDesc")}</p>
          </div>
        ) : (
          <div className="cat-grid">
            {list.map((category, i) => (
              <CatCard
                key={category.id}
                iconClass={category.iconClass}
                colorClass={category.colorClass}
                title={category.name}
                description={category.description}
                href={category.activeProductCount > 0 ? `/${category.slug}` : null}
                delay={i + 1}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
