"use client";

import Link from "next/link";
import Reveal from "@/components/public/Reveal/Reveal";
import AnimatedNumber from "@/components/public/AnimatedNumber/AnimatedNumber";
import Spotlight from "@/components/public/Spotlight/Spotlight";
import WhyScene from "@/components/public/WhyScene/WhyScene";
import SparkProfiler from "@/components/public/SparkProfiler/SparkProfiler";
import FaqAccordion from "@/components/public/FaqAccordion/FaqAccordion";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/Button/Button.css";
import "@/routes/Home/HomePageClient.css";
import "@/routes/Home/HomeSections.css";
import "@/components/public/Reveal/Reveal.css";

const FEATURES = [
  { icon: "fa-solid fa-cube", titleKey: "why.f1t", descKey: "why.f1d" },
  { icon: "fa-solid fa-book-open", titleKey: "why.f2t", descKey: "why.f2d" },
  { icon: "fa-solid fa-laptop-code", titleKey: "why.f3t", descKey: "why.f3d" },
  { icon: "fa-solid fa-lock-open", titleKey: "why.f4t", descKey: "why.f4d" },
  { icon: "fa-solid fa-shield-halved", titleKey: "why.f5t", descKey: "why.f5d" }
];

const PERF_STATS = [
  { v: "perf.s1v", l: "perf.s1l" },
  { v: "perf.s2v", l: "perf.s2l" },
  { v: "perf.s3v", l: "perf.s3l" }
];

const STEPS = [
  { icon: "fa-solid fa-lightbulb", titleKey: "flow.s1t", descKey: "flow.s1d", chips: ["flow.s1c1", "flow.s1c2", "flow.s1c3"] },
  { icon: "fa-solid fa-code", titleKey: "flow.s2t", descKey: "flow.s2d", chips: ["flow.s2c1", "flow.s2c2", "flow.s2c3"] },
  { icon: "fa-solid fa-vial-circle-check", titleKey: "flow.s3t", descKey: "flow.s3d", chips: ["flow.s3c1", "flow.s3c2", "flow.s3c3"] },
  { icon: "fa-solid fa-rocket", titleKey: "flow.s4t", descKey: "flow.s4d", chips: ["flow.s4c1", "flow.s4c2", "flow.s4c3"] }
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
          <div className="sec-head">
            <Reveal as="span" className="eyebrow">{t("why.eyebrow")}</Reveal>
            <Reveal as="h2" className="section-title" delay={1}>{t("why.title")}</Reveal>
            <Reveal as="p" className="section-sub" delay={2}>{t("why.sub")}</Reveal>
          </div>
          <div className="why-grid">
            {FEATURES.map((f, i) => (
              <Spotlight as="div" className="why-card" delay={Math.min(i + 1, 6)} key={f.titleKey}>
                <WhyScene icon={f.icon} index={i + 1} />
                <div className="why-body">
                  <h3>{t(f.titleKey)}</h3>
                  <p>{t(f.descKey)}</p>
                </div>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner perf">
          <div className="perf-copy">
            <Reveal as="span" className="eyebrow">{t("perf.eyebrow")}</Reveal>
            <Reveal as="h2" className="perf-title" delay={1}>{t("perf.title")}</Reveal>
            <Reveal as="p" className="perf-desc" delay={2}>{t("perf.desc")}</Reveal>
            <div className="perf-stats">
              {PERF_STATS.map((s, i) => (
                <Spotlight as="div" className="perf-stat" delay={i + 3} key={s.v}>
                  <strong>{t(s.v)}</strong>
                  <span>{t(s.l)}</span>
                </Spotlight>
              ))}
            </div>
          </div>
          <Reveal as="div" className="perf-visual" delay={2}>
            <SparkProfiler />
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="sec-head">
            <Reveal as="span" className="eyebrow">{t("flow.eyebrow")}</Reveal>
            <Reveal as="h2" className="section-title" delay={1}>{t("flow.title")}</Reveal>
            <Reveal as="p" className="section-sub" delay={2}>{t("flow.sub")}</Reveal>
          </div>
          <div className="steps">
            {STEPS.map((st, i) => (
              <Spotlight as="div" className="step-card" delay={Math.min(i + 1, 6)} key={st.titleKey} style={{ "--p": `${(i + 1) * 25}%` }}>
                <div className="step-top">
                  <span className="step-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="step-ico"><i className={st.icon}></i></span>
                </div>
                <h3>{t(st.titleKey)}</h3>
                <p>{t(st.descKey)}</p>
                <ul className="step-chips">
                  {st.chips.map((c) => (
                    <li key={c}>{t(c)}</li>
                  ))}
                </ul>
                <div className="step-foot">
                  <span className="step-bar"><span></span></span>
                  <span className="step-count">{t("flow.step")} {i + 1}/{STEPS.length}</span>
                </div>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="sec-head">
            <Reveal as="span" className="eyebrow">{t("faq.eyebrow")}</Reveal>
            <Reveal as="h2" className="section-title" delay={1}>{t("faq.title")}</Reveal>
            <Reveal as="p" className="section-sub" delay={2}>{t("faq.sub")}</Reveal>
          </div>
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
