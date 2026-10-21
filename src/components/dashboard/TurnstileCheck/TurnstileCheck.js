"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import "./TurnstileCheck.css";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (window.__nebulonTurnstile) return window.__nebulonTurnstile;

  window.__nebulonTurnstile = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile-missing")));
    script.onerror = () => {
      window.__nebulonTurnstile = null;
      reject(new Error("turnstile-load"));
    };
    document.head.appendChild(script);
  });
  return window.__nebulonTurnstile;
}

const TurnstileCheck = forwardRef(function TurnstileCheck({ siteKey, onToken }, ref) {
  const { t, locale } = useLanguage();
  const hostRef = useRef(null);
  const widgetRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState("checking");
  const [interactive, setInteractive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const localeRef = useRef(locale);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    function calc() {
      const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const wanted = Math.max(1, (fontSize / 16) * 1.15);
      const room = hostRef.current?.parentElement?.parentElement?.parentElement?.clientWidth || 0;
      const fit = room ? Math.max(1, (room - 32) / 300) : wanted;
      setZoom(Math.min(wanted, fit, 2.4));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("checking");
    setInteractive(false);
    onTokenRef.current?.("");

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !hostRef.current) return;
        widgetRef.current = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: "dark",
          appearance: "interaction-only",
          language: localeRef.current === "tr" ? "tr" : "en",
          retry: "auto",
          "refresh-expired": "auto",
          callback: (token) => {
            setInteractive(false);
            setStatus("passed");
            onTokenRef.current?.(token);
          },
          "expired-callback": () => {
            setStatus("checking");
            onTokenRef.current?.("");
          },
          "timeout-callback": () => {
            setStatus("checking");
            onTokenRef.current?.("");
          },
          "error-callback": () => {
            setInteractive(false);
            setStatus("error");
            onTokenRef.current?.("");
            return true;
          },
          "before-interactive-callback": () => setInteractive(true),
          "after-interactive-callback": () => setInteractive(false)
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        onTokenRef.current?.("");
      });

    return () => {
      cancelled = true;
      try {
        if (widgetRef.current != null && window.turnstile) window.turnstile.remove(widgetRef.current);
      } catch (err) {}
      widgetRef.current = null;
    };
  }, [siteKey, attempt]);

  const reset = useCallback(() => {
    setStatus("checking");
    setInteractive(false);
    onTokenRef.current?.("");
    try {
      if (widgetRef.current != null && window.turnstile) window.turnstile.reset(widgetRef.current);
      else setAttempt((n) => n + 1);
    } catch (err) {
      setAttempt((n) => n + 1);
    }
  }, []);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  const title = t("login.captchaTitle");
  const sub =
    status === "passed"
      ? t("login.captchaPassed")
      : status === "error"
        ? t("login.captchaFailed")
        : interactive
          ? t("login.captchaInteract")
          : t("login.captchaChecking");

  return (
    <div className={`login-captcha is-${status}`} role="status" aria-live="polite">
      <div className="login-captcha-row">
        <span className="login-captcha-icon" aria-hidden="true">
          {status === "passed" ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path className="login-captcha-check" d="M5.5 12.5l4.2 4.2 8.8-9.4" />
            </svg>
          ) : status === "error" ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 6.5v7.2" />
              <circle cx="12" cy="17.6" r="0.7" fill="currentColor" stroke="none" />
            </svg>
          ) : (
            <svg className="login-captcha-spin" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
            </svg>
          )}
        </span>

        <span className="login-captcha-text">
          <strong>{title}</strong>
          <small>{sub}</small>
        </span>

        {status === "error" ? (
          <button type="button" className="login-captcha-brand login-captcha-retry" onClick={() => setAttempt((n) => n + 1)}>
            {t("login.captchaRetry")}
          </button>
        ) : (
          <span className="login-captcha-brand">CLOUDFLARE</span>
        )}
      </div>

      <div className={`login-captcha-expand${interactive ? " is-open" : ""}`}>
        <div className="login-captcha-expand-inner">
          <div className="login-captcha-host">
            <div ref={hostRef} className="login-captcha-widget" style={{ zoom }} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default TurnstileCheck;
