"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import { MODAL_OUT_MS } from "@/components/dashboard/hooks/useModalPresence";
import "@/components/dashboard/AdminConfirm/AdminConfirm.css";

const AdminConfirmContext = createContext(null);

export function AdminConfirmProvider({ children }) {
  const { t, localizeMessage } = useLanguage();
  const [message, setMessage] = useState("");
  const [closing, setClosing] = useState(false);
  const [options, setOptions] = useState({});
  const resolver = useRef(null);
  const timerRef = useRef(null);
  const backdropRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!message || closing) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      const backdrops = document.querySelectorAll(".admin-modal-backdrop:not(.is-closing)");
      if (backdrops[backdrops.length - 1] !== backdropRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      closeRef.current?.(false);
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [message, closing]);

  const confirmAction = useCallback((nextMessage, opts) => {
    clearTimeout(timerRef.current);
    setClosing(false);
    setOptions(opts || {});
    setMessage(nextMessage);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result) {
    if (closing) return;
    const resolve = resolver.current;
    resolver.current = null;
    setClosing(true);
    timerRef.current = setTimeout(() => {
      setMessage("");
      setClosing(false);
    }, MODAL_OUT_MS);
    if (resolve) resolve(result);
  }

  closeRef.current = close;

  return (
    <AdminConfirmContext.Provider value={confirmAction}>
      {children}
      {message && typeof document !== "undefined" && createPortal(
        <div ref={backdropRef} className={`admin-modal-backdrop admin-modal-blur${closing ? " is-closing" : ""}`} onClick={() => close(false)}>
          <div className="admin-modal admin-confirm-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="admin-confirm-icon"><i className="fa-solid fa-triangle-exclamation" /></div>
            <p>{localizeMessage(message)}</p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn ghost" onClick={() => close(false)}>{t("admin.form.cancel")}</button>
              <button type="button" className="admin-btn danger" onClick={() => close(true)}>{options.confirmLabel || t("admin.form.delete")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminConfirmContext.Provider>
  );
}

export function useAdminConfirm() {
  const context = useContext(AdminConfirmContext);
  if (!context) throw new Error("useAdminConfirm must be used within AdminConfirmProvider");
  return context;
}
