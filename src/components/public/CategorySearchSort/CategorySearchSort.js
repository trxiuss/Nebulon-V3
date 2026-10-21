"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/public/Reveal/Reveal";
import PluginCard from "@/components/public/PluginCard/PluginCard";
import SortDropdown from "@/components/public/SortDropdown/SortDropdown";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/Button/Button.css";
import "@/routes/shared/PageLayout.css";
import "@/components/public/CategorySearchSort/CategorySearchSort.css";

function resolveText(field, locale) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return locale === "tr" ? field.tr || field.en || "" : field.en || field.tr || "";
}

export default function CategorySearchSort({ items, titleKey, subKey, titleText, subText }) {
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");

  const safeItems = Array.isArray(items) ? items : [];
  const hasDownloads = safeItems.some((item) => typeof item.downloads === "number");
  const isEmptyCatalog = safeItems.length === 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    let list = safeItems;

    if (q) {
      list = safeItems.filter((item) => {
        const name = resolveText(item.title, locale).toLocaleLowerCase("tr-TR");
        const desc = resolveText(item.desc, locale).toLocaleLowerCase("tr-TR");
        return name.includes(q) || desc.includes(q);
      });
    }

    const sorted = [...list];
    if (sort === "nameAsc") {
      sorted.sort((a, b) => resolveText(a.title, locale).localeCompare(resolveText(b.title, locale), "tr"));
    } else if (sort === "nameDesc") {
      sorted.sort((a, b) => resolveText(b.title, locale).localeCompare(resolveText(a.title, locale), "tr"));
    } else if (sort === "downloadsDesc") {
      sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sort === "downloadsAsc") {
      sorted.sort((a, b) => (a.downloads || 0) - (b.downloads || 0));
    }

    return sorted;
  }, [safeItems, query, sort, locale]);

  return (
    <div className="page-body" style={{ paddingTop: "2rem" }}>
      <Reveal as={Link} href="/projects" className="back-link">
        <i className="fa-solid fa-arrow-left"></i> <span>{t("plugins.back")}</span>
      </Reveal>

      <Reveal as="div" className="page-head" style={{ padding: "0.75rem 0 2.25rem" }}>
        <h1>{resolveText(titleText, locale) || (titleKey ? t(titleKey) : "")}</h1>
        <p>{resolveText(subText, locale) || (subKey ? t(subKey) : "")}</p>
      </Reveal>

      {!isEmptyCatalog && (
        <Reveal as="div" className="category-toolbar">
          <div className="search-input-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                aria-label={t("search.clear")}
                onClick={() => setQuery("")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <SortDropdown
            value={sort}
            onChange={setSort}
            label={t("sort.label")}
            options={[
              { value: "default", label: t("sort.label") },
              { value: "nameAsc", label: t("sort.nameAsc") },
              { value: "nameDesc", label: t("sort.nameDesc") },
              ...(hasDownloads
                ? [
                    { value: "downloadsDesc", label: t("sort.downloadsDesc") },
                    { value: "downloadsAsc", label: t("sort.downloadsAsc") }
                  ]
                : [])
            ]}
          />
        </Reveal>
      )}

      {isEmptyCatalog ? (
        <div className="empty-state">
          <i className="fa-solid fa-box-open"></i>
          <h3>{t("products.noneTitle")}</h3>
          <p>{t("products.noneDesc")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-satellite-dish"></i>
          <h3>{t("search.noResultsTitle")}</h3>
          <p>
            {`\u201c${query}\u201d `}
            {t("search.noResultsDesc")}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setQuery("");
              setSort("default");
            }}
          >
            <span>{t("search.resetBtn")}</span>
          </button>
        </div>
      ) : (
        <div className="plugins-grid">
          {filtered.map((item, i) => (
            <PluginCard key={item.id} item={item} delay={(i % 6) + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
