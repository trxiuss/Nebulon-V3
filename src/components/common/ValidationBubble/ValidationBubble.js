"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import "./ValidationBubble.css";

const SHOW_MS = 5000;
const OUT_MS = 320;

function fill(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, value), template);
}

export default function ValidationBubble() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  const [bubble, setBubble] = useState(null);
  const targetRef = useRef(null);
  const timersRef = useRef([]);
  const handledRef = useRef(false);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const hide = useCallback(() => {
    clearTimers();
    const target = targetRef.current;
    if (target) target.classList.remove("field-invalid");
    targetRef.current = null;
    setBubble((current) => (current ? { ...current, closing: true } : current));
    timersRef.current.push(setTimeout(() => setBubble(null), OUT_MS));
  }, []);

  const place = useCallback((el, text) => {
    const rect = el.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 24);
    let left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const arrow = Math.max(18, Math.min(rect.left + 24 - left, width - 30));
    const top = rect.bottom + 12;
    return { text, left, top, width, arrow };
  }, []);

  useEffect(() => {
    function messageFor(el) {
      const tt = tRef.current;
      const v = el.validity;
      if (v.valueMissing) return tt("validation.valueMissing");
      if (v.tooShort) return fill(tt("validation.tooShort"), { min: el.minLength, n: el.value.length });
      if (v.tooLong) return fill(tt("validation.tooLong"), { max: el.maxLength });
      if (v.typeMismatch) {
        if (el.type === "email") return tt("validation.email");
        if (el.type === "url") return tt("validation.url");
        return tt("validation.invalid");
      }
      if (v.patternMismatch) return el.title || tt("validation.pattern");
      if (v.rangeUnderflow) return fill(tt("validation.min"), { min: el.min });
      if (v.rangeOverflow) return fill(tt("validation.max"), { max: el.max });
      if (v.customError && el.validationMessage) return el.validationMessage;
      return tt("validation.invalid");
    }

    function show(el) {
      clearTimers();
      if (targetRef.current && targetRef.current !== el) targetRef.current.classList.remove("field-invalid");
      targetRef.current = el;
      el.classList.add("field-invalid");
      try {
        el.focus({ preventScroll: false });
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (err) {}
      setBubble({ ...place(el, messageFor(el)), closing: false });
      timersRef.current.push(setTimeout(hide, SHOW_MS));
    }

    function onInvalid(event) {
      const el = event.target;
      if (!(el instanceof HTMLElement)) return;
      event.preventDefault();
      if (handledRef.current) return;
      handledRef.current = true;
      setTimeout(() => {
        handledRef.current = false;
      }, 0);
      show(el);
    }

    function onEdit(event) {
      if (targetRef.current && event.target === targetRef.current) hide();
    }

    function onReposition() {
      const el = targetRef.current;
      if (!el) return;
      setBubble((current) => (current ? { ...current, ...place(el, current.text) } : current));
    }

    function onKey(event) {
      if (event.key === "Escape" && targetRef.current) hide();
    }

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      clearTimers();
    };
  }, [hide, place]);

  if (!bubble || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`validation-bubble${bubble.closing ? " is-closing" : ""}`}
      role="alert"
      style={{ left: bubble.left, top: bubble.top, width: bubble.width, "--vb-arrow": `${bubble.arrow}px` }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M12 7.2v6" strokeLinecap="round" />
        <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
      </svg>
      <span>{bubble.text}</span>
    </div>,
    document.body
  );
}
