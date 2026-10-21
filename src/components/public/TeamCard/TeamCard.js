"use client";

import Reveal from "@/components/public/Reveal/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import { SOCIAL_ICON_META, SOCIAL_KEYS } from "@/lib/utils";
import "@/components/public/TeamCard/TeamCard.css";

export default function TeamCard({ member, delay }) {
  const { locale } = useLanguage();
  const role = locale === "tr" ? member.role?.tr : member.role?.en || member.role?.tr;
  const socialEntries = member.socials && typeof member.socials === "object" ? member.socials : {};
  const orderedKeys = Object.keys(socialEntries).filter((key) => SOCIAL_KEYS.includes(key));
  for (const key of SOCIAL_KEYS) if (!orderedKeys.includes(key)) orderedKeys.push(key);
  const activeSocials = orderedKeys.filter((key) => socialEntries[key]);

  return (
    <Reveal className="team-card card-hover-target" delay={delay}>
      <div className="avatar-ring">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.name} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg)"
            }}
          >
            <i className="fa-solid fa-user" style={{ fontSize: "1.8rem", color: "var(--text2)" }}></i>
          </div>
        )}
      </div>
      <h3>{member.name}</h3>
      {role && <p className="role">{role}</p>}
      {activeSocials.length > 0 && (
        <div className="socials">
          {activeSocials.map((key) => {
            const meta = SOCIAL_ICON_META[key];
            return (
              <a
                key={key}
                href={member.socials[key]}
                target="_blank"
                rel="noopener"
                title={meta.label}
                aria-label={meta.label}
              >
                <i className={meta.icon}></i>
              </a>
            );
          })}
        </div>
      )}
    </Reveal>
  );
}
