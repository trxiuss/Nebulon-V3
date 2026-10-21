"use client";

import Reveal from "@/components/public/Reveal/Reveal";
import TeamCard from "@/components/public/TeamCard/TeamCard";
import { useLanguage } from "@/context/LanguageContext";
import "@/routes/shared/PageLayout.css";
import "@/routes/Team/TeamPageClient.css";
import "@/components/public/Reveal/Reveal.css";

export default function TeamPageClient({ members }) {
  const { t } = useLanguage();
  const list = Array.isArray(members) ? members : [];

  return (
    <>
      <Reveal as="div" className="page-head">
        <h1>{t("team.title")}</h1>
        <p>{t("team.sub")}</p>
      </Reveal>

      <div className="page-body">
        {list.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-users"></i>
            <h3>{t("search.noResultsTitle")}</h3>
          </div>
        ) : (
          <div className="team-grid">
            {list.map((member, i) => (
              <TeamCard member={member} delay={i + 1} key={member.id} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
