"use client";

import Reveal from "@/components/public/Reveal/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { contactIconClass } from "@/lib/preset-icons";
import "@/routes/shared/PageLayout.css";
import "@/routes/Contact/ContactPageClient.css";
import "@/components/public/Reveal/Reveal.css";

export default function ContactPageClient({ items = [] }) {
  const { t, locale } = useLanguage();
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="contact-wrap">
      <Reveal as="div" className="page-head" style={{ paddingBottom: "1.75rem" }}>
        <h1>{t("contact.title")}</h1>
        <p>{t("contact.sub")}</p>
      </Reveal>

      {list.length === 0 ? (
        <Reveal as="div" className="contact-empty" delay={1}>
          <p>{t("contact.empty")}</p>
        </Reveal>
      ) : (
        <div className="contact-grid" data-count={list.length}>
          {list.map((item, index) => {
            const title =
              locale === "tr"
                ? item.title_tr || item.title_en || ""
                : item.title_en || item.title_tr || "";
            const description =
              locale === "tr"
                ? item.description_tr || item.description_en || ""
                : item.description_en || item.description_tr || "";
            const buttonText =
              locale === "tr"
                ? item.button_text_tr || item.button_text_en || t("contact.join")
                : item.button_text_en || item.button_text_tr || t("contact.join");

            return (
              <Reveal
                as="div"
                key={item.id}
                className="contact-card card-hover-target"
                delay={(index % 3) + 1}
              >
                <div className={`contact-icon contact-brand-${item.icon_key}`}>
                  <i className={contactIconClass(item.icon_key)}></i>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <a
                  href={item.button_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-discord"
                >
                  <span>{buttonText}</span> <i className="fa-solid fa-arrow-right-to-bracket"></i>
                </a>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
