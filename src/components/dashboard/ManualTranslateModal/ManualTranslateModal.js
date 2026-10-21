"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import useModalPresence from "@/components/dashboard/hooks/useModalPresence";
import "@/components/dashboard/ManualTranslateModal/ManualTranslateModal.css";

export default function ManualTranslateModal({ open, fields = [], enabled = false, values = {}, allowed = true, onClose, onApply }) {
  const { t, localizeMessage } = useLanguage();
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localValues, setLocalValues] = useState(values);
  const [error, setError] = useState("");
  const backdropRef = useRef(null);
  const { rendered: mounted, closing } = useModalPresence(open);

  useEffect(() => {
    if (!open) return;
    setLocalEnabled(enabled);
    setLocalValues(values || {});
    setError("");
  }, [open]);

  useEffect(() => {
    if (allowed) return;
    setLocalEnabled(false);
    setError(t("admin.manual.forbidden"));
    if (open) onClose?.();
  }, [allowed, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      const backdrops = document.querySelectorAll(".admin-modal-backdrop:not(.is-closing)");
      if (backdrops[backdrops.length - 1] !== backdropRef.current) return;
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  function toggleEnabled() {
    if (!allowed) {
      setError(t("admin.manual.forbidden"));
      return;
    }
    setError("");
    setLocalEnabled((prev) => !prev);
  }

  function handleApply() {
    if (!allowed) {
      setError(t("admin.manual.forbidden"));
      return;
    }
    if (localEnabled) {
      const hasAny = fields.some((field) => String(localValues?.[field.key] || "").trim());
      if (!hasAny) {
        setError(t("admin.manual.empty"));
        return;
      }
    }
    const cleaned = {};
    for (const field of fields) cleaned[field.key] = String(localValues?.[field.key] || "").trim();
    onApply?.(localEnabled, cleaned);
    onClose?.();
  }

  return createPortal(
    <div ref={backdropRef} className={`admin-modal-backdrop admin-modal-blur${closing ? " is-closing" : ""}`} onClick={() => !closing && onClose?.()}>
      <div
        className="admin-modal admin-manual-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("admin.manual.title")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-head">
          <h2>
            <i className="fa-solid fa-language" /> {t("admin.manual.title")}
          </h2>
          <button type="button" className="admin-modal-close" onClick={() => onClose?.()} aria-label={t("admin.form.cancel")}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <label className="admin-manual-switch">
          <input type="checkbox" checked={localEnabled} onChange={toggleEnabled} />
          <span className="admin-manual-switch-track" aria-hidden="true">
            <span className="admin-manual-switch-dot" />
          </span>
          <span className="admin-manual-switch-text">
            <strong>{t("admin.manual.enable")}</strong>
          </span>
        </label>

        {error && (
          <div className="admin-alert error">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{localizeMessage(error)}</span>
          </div>
        )}

        <div className={`admin-manual-fields${localEnabled ? "" : " is-locked"}`}>
          {fields.map((field) => (
            <div className="admin-field full" key={field.key}>
              <label htmlFor={`manual-${field.key}`}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  id={`manual-${field.key}`}
                  rows={3}
                  disabled={!localEnabled}
                  value={localValues?.[field.key] || ""}
                  placeholder={field.placeholder || ""}
                  onChange={(event) =>
                    setLocalValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              ) : (
                <input
                  id={`manual-${field.key}`}
                  type="text"
                  disabled={!localEnabled}
                  value={localValues?.[field.key] || ""}
                  placeholder={field.placeholder || ""}
                  onChange={(event) =>
                    setLocalValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="admin-manual-actions">
          <button type="button" className="admin-btn ghost" onClick={() => onClose?.()}>
            {t("admin.form.cancel")}
          </button>
          <button type="button" className="admin-btn primary" onClick={handleApply}>
            <i className="fa-solid fa-check" /> {t("admin.manual.apply")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
