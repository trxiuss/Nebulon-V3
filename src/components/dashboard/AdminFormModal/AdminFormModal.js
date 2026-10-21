"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import useModalPresence from "@/components/dashboard/hooks/useModalPresence";
import "@/components/dashboard/AdminFormModal/AdminFormModal.css";

export default function AdminFormModal({ open, title, onClose, busy = false, children }) {
  const { t } = useLanguage();
  const titleId = useId();
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  const snapshotRef = useRef({ title, children });
  const { rendered, closing } = useModalPresence(open);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    if (open) snapshotRef.current = { title, children };
  });

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector("input:not(:disabled), textarea:not(:disabled), select:not(:disabled)");
      (firstField || dialogRef.current)?.focus({ preventScroll: true });
    });

    function onKey(event) {
      const backdrops = document.querySelectorAll(".admin-modal-backdrop:not(.is-closing)");
      if (backdrops[backdrops.length - 1] !== backdropRef.current) return;
      if (event.key === "Escape") {
        if (!busyRef.current) {
          event.preventDefault();
          closeRef.current?.();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || []).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!rendered || typeof document === "undefined") return null;

  const view = open ? { title, children } : snapshotRef.current;

  return createPortal(
    <div
      ref={backdropRef}
      className={`admin-modal-backdrop admin-modal-blur admin-form-backdrop${closing ? " is-closing" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy && !closing) onClose();
      }}
    >
      <div ref={dialogRef} className="admin-modal admin-form-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <h2 id={titleId}>{view.title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={busy || closing} aria-label={t("admin.form.cancel")}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <div className="admin-form-modal-body">{view.children}</div>
      </div>
    </div>,
    document.body
  );
}
