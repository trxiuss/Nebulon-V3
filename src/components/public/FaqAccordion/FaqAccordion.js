"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/public/Reveal/Reveal";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/FaqAccordion/FaqAccordion.css";

const FAQ_KEYS = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" }
];

export default function FaqAccordion() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(-1);
  const rootRef = useRef(null);
  const answerRefs = useRef([]);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenIndex(-1);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) setOpenIndex(-1);
        });
      },
      { threshold: 0 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      <h2 className="faq-title">{t("faq.title")}</h2>
      {FAQ_KEYS.map((item, idx) => {
        const isOpen = openIndex === idx;
        const el = answerRefs.current[idx];
        const inner = el ? el.firstElementChild : null;
        const height = isOpen && inner ? `${inner.offsetHeight + 11}px` : "0px";
        return (
          <Reveal as="div" className={`faq-item card-hover-target${isOpen ? " active" : ""}`} delay={idx + 1} key={item.q}>
            <button
              className="faq-question"
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex((prev) => (prev === idx ? -1 : idx));
              }}
            >
              <span>{t(item.q)}</span> <i className="fa-solid fa-chevron-down"></i>
            </button>
            <div
              className="faq-answer"
              id={`faq-${idx}`}
              ref={(node) => { answerRefs.current[idx] = node; }}
              style={{ maxHeight: height }}
            >
              <p>{t(item.a)}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
