"use client";

import { useEffect } from "react";
import Link from "next/link";
import Reveal from "@/components/public/Reveal/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/Button/Button.css";
import "@/routes/NotFound/NotFoundClient.css";
import "@/components/public/Reveal/Reveal.css";

export default function NotFoundClient() {
  const { t } = useLanguage();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-not-found");
    return () => root.classList.remove("is-not-found");
  }, []);

  return (
    <section className="error-section">
      <Reveal as="div" className="error-code">404</Reveal>
      <Reveal as="h1" className="error-title" delay={1}>{t("err.title")}</Reveal>
      <Reveal as="p" className="error-desc" delay={2}>{t("err.desc")}</Reveal>
      <Reveal as={Link} href="/" className="btn btn-primary" delay={3}>
        <i className="fa-solid fa-shuttle-space"></i> <span>{t("err.home")}</span>
      </Reveal>
    </section>
  );
}
