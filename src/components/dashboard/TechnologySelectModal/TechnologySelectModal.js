"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import useModalPresence from "@/components/dashboard/hooks/useModalPresence";
import { PRODUCT_TECH_LABELS, TECH_TAG_ICON_CLASSES } from "@/lib/preset-icons";
import "@/components/dashboard/TechnologySelectModal/TechnologySelectModal.css";

export default function TechnologySelectModal({ open, options, selected, onToggle, onClose }) {
  const { t } = useLanguage();
  const backdropRef = useRef(null);
  const { rendered, closing } = useModalPresence(open);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      const backdrops = document.querySelectorAll(".admin-modal-backdrop:not(.is-closing)");
      if (backdrops[backdrops.length - 1] !== backdropRef.current) return;
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div ref={backdropRef} className={`admin-modal-backdrop admin-modal-blur${closing ? " is-closing" : ""}`} onClick={() => !closing && onClose()}>
      <div className="admin-modal admin-tech-modal" role="dialog" aria-modal="true" aria-labelledby="technology-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <h2 id="technology-modal-title">
            <i className="fa-solid fa-code" /> {t("admin.products.techTags")}
          </h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label={t("admin.form.cancel")}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-tech-grid">
          {options.map((tag) => {
            const active = selected.includes(tag);
            return (
              <button type="button" className={`admin-tech-option${active ? " selected" : ""}`} aria-pressed={active} onClick={() => onToggle(tag)} key={tag}>
                <i className={`${TECH_TAG_ICON_CLASSES[tag]} colored`} />
                <span>{PRODUCT_TECH_LABELS[tag]}</span>
                <i className={`fa-solid ${active ? "fa-circle-check" : "fa-circle"} admin-tech-check`} />
              </button>
            );
          })}
        </div>
        <div className="admin-manual-actions">
          <button type="button" className="admin-btn primary" onClick={onClose}>
            <i className="fa-solid fa-check" /> {t("admin.products.techDone")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
