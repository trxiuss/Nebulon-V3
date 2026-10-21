"use client";

import Link from "next/link";
import Reveal from "@/components/public/Reveal/Reveal";
import AnimatedNumber from "@/components/public/AnimatedNumber/AnimatedNumber";
import FaqAccordion from "@/components/public/FaqAccordion/FaqAccordion";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/Button/Button.css";
import "@/routes/Home/HomePageClient.css";
import "@/components/public/Reveal/Reveal.css";

const FEATURES = [
  { icon: "fa-solid fa-gift", titleKey: "why.f1t", descKey: "why.f1d" },
  { icon: "fa-solid fa-bolt", titleKey: "why.f2t", descKey: "why.f2d" },
  { icon: "fa-solid fa-shield-halved", titleKey: "why.f3t", descKey: "why.f3d" },
  { icon: "fa-solid fa-users", titleKey: "why.f4t", descKey: "why.f4d" }
];

export default function HomePageClient({ totalDownloads, activeProjectCount, teamCount }) {
  const { t, locale } = useLanguage();
  const numLocale = locale === "en" ? "en-US" : "tr-TR";

  return (
    <>
      <section id="hero">
        <Reveal as="div" className="hero-content">
          <h1 className="rgb-text">NEBULON PROJECT</h1>
          <p>
            <span>{t("hero.desc")}</span>
          </p>
          <div className="stats-row hero-stats">
            <Reveal as="div" className="stat-item" delay={1}>
              <h3><AnimatedNumber value={activeProjectCount} duration={3200} formatLocale={numLocale} /></h3>
              <p><span>{t("stat.projects")}</span></p>
            </Reveal>
            <Reveal as="div" className="stat-item" delay={2}>
              <h3><AnimatedNumber value={totalDownloads} duration={3500} formatLocale={numLocale} /></h3>
              <p><span>{t("stat.downloads")}</span></p>
            </Reveal>
            <Reveal as="div" className="stat-item" delay={3}>
              <h3><AnimatedNumber value={teamCount} duration={3000} formatLocale={numLocale} /></h3>
              <p><span>{t("stat.team")}</span></p>
            </Reveal>
            <Reveal as="div" className="stat-item" delay={4}>
              <h3>7/24</h3>
              <p><span>{t("stat.support")}</span></p>
            </Reveal>
          </div>
          <Reveal as="div" className="hero-btns">
            <Link href="/projects" className="btn btn-primary">
              <span>{t("hero.btnProjects")}</span> <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </Reveal>
        </Reveal>
      </section>

      <section className="section">
        <div className="section-inner">
          <Reveal as="h2" className="section-title">{t("why.title")}</Reveal>
          <Reveal as="p" className="section-sub">{t("why.sub")}</Reveal>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <Reveal as="div" className="feature-card card-hover-target" delay={i + 1} key={f.titleKey}>
                <div className="feature-icon"><i className={f.icon}></i></div>
                <h3>{t(f.titleKey)}</h3>
                <p>{t(f.descKey)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="discord-row">
            <div>
              <FaqAccordion />
            </div>
            <Reveal as="div" className="widget-box card-hover-target" delay={2}>
              <iframe
                src="https://discord.com/widget?id=1398287204303896727&theme=dark"
                allowtransparency="true"
                frameBorder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                title="Discord"
              ></iframe>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
