"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Spotlight from "@/components/public/Spotlight/Spotlight";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/FaqAccordion/FaqAccordion.css";

const FAQ_KEYS = [
  { q: "faq.q1", a: "faq.a1", icon: "fa-solid fa-key" },
  { q: "faq.q2", a: "faq.a2", icon: "fa-solid fa-headset" },
  { q: "faq.q3", a: "faq.a3", icon: "fa-solid fa-download" },
  { q: "faq.q4", a: "faq.a4", icon: "fa-solid fa-shield-halved" },
  { q: "faq.q5", a: "faq.a5", icon: "fa-solid fa-code-branch" },
  { q: "faq.q6", a: "faq.a6", icon: "fa-solid fa-comment-dots" }
];

export default function FaqAccordion() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenIndex(-1);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const toggle = useCallback((idx) => {
    setOpenIndex((prev) => (prev === idx ? -1 : idx));
  }, []);

  return (
    <div className="nfaq" ref={rootRef}>
      {FAQ_KEYS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <Spotlight as="div" className={`nfaq-item${isOpen ? " is-open" : ""}`} delay={Math.min(idx + 1, 6)} key={item.q}>
            <button
              className="nfaq-q"
              type="button"
              aria-expanded={isOpen}
              aria-controls={`nfaq-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(idx);
              }}
            >
              <span className="nfaq-ico"><i className={item.icon}></i></span>
              <span className="nfaq-text">{t(item.q)}</span>
              <span className="nfaq-toggle" aria-hidden="true"><i></i><i></i></span>
            </button>
            <div className="nfaq-a" id={`nfaq-${idx}`} role="region">
              <div className="nfaq-a-clip">
                <p>{t(item.a)}</p>
              </div>
            </div>
          </Spotlight>
        );
      })}
    </div>
  );
}
