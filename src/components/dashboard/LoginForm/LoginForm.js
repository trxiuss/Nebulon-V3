"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TurnstileCheck from "@/components/dashboard/TurnstileCheck/TurnstileCheck";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/shared";
import "@/components/dashboard/LoginForm/LoginForm.css";

const ERROR_CODE_MAP = {
  "auth.invalid": "login.errorInvalid",
  "auth.missing": "login.errorEmpty",
  "auth.rateLimited": "login.errorRateLimited",
  "auth.serverError": "login.errorGeneric",
  "auth.captcha": "login.errorCaptcha"
};

const MIN_PASSWORD_LENGTH = 8;

export default function LoginForm({ turnstileSiteKey = "" }) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setErrorState] = useState("");
  const [errorId, setErrorId] = useState(0);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const captchaRef = useRef(null);
  const captchaEnabled = Boolean(turnstileSiteKey);

  function setError(code) {
    setClosing(false);
    setErrorState(code);
    if (code) setErrorId((n) => n + 1);
  }

  useEffect(() => {
    if (!closing) return undefined;
    const removeTimer = setTimeout(() => {
      setErrorState("");
      setClosing(false);
    }, 450);
    return () => clearTimeout(removeTimer);
  }, [closing]);

  function dismissError() {
    if (error && !closing) setClosing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const hasUser = Boolean(username.trim());
    const hasPass = Boolean(password);

    if (!hasUser && !hasPass) {
      setError("login.errorEmpty");
      return;
    }
    if (!hasUser) {
      setError("login.errorUsernameRequired");
      return;
    }
    if (!hasPass || password.length < MIN_PASSWORD_LENGTH) {
      setError("login.errorPasswordMin");
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError("login.errorCaptchaPending");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({
          username: username.trim(),
          password,
          cfTurnstile: captchaToken,
          website: honeypot
        })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(ERROR_CODE_MAP[data?.code] || "login.errorGeneric");
        setLoading(false);
        if (captchaEnabled) captchaRef.current?.reset();
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError("login.errorNetwork");
      setLoading(false);
      if (captchaEnabled) captchaRef.current?.reset();
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <div key={errorId} className={`login-alert${closing ? " is-closing" : ""}`}>
          <div className="login-alert-box" role="alert">
            <svg className="login-alert-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="9.25" />
              <path d="M12 7.2v6" strokeLinecap="round" />
              <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            <span>{t(error).replace("{n}", MIN_PASSWORD_LENGTH)}</span>
          </div>
        </div>
      )}

      <div className="admin-field">
        <label htmlFor="username">{t("login.username")}</label>
        <div className="admin-input-wrap">
          <i className="fa-solid fa-user"></i>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t("login.usernamePlaceholder")}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              dismissError();
            }}
            required
          />
        </div>
      </div>

      <div className="admin-field">
        <label htmlFor="password">{t("login.password")}</label>
        <div className="admin-input-wrap">
          <i className="fa-solid fa-lock"></i>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              dismissError();
            }}
            required
          />
          <button
            type="button"
            className="admin-input-action"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
            title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
          >
            <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
          </button>
        </div>
      </div>

      <div className="login-hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {captchaEnabled && (
        <TurnstileCheck ref={captchaRef} siteKey={turnstileSiteKey} onToken={setCaptchaToken} />
      )}

      <button
        type="submit"
        className="admin-btn primary block"
        disabled={loading || (captchaEnabled && !captchaToken)}
      >
        {loading ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin"></i> {t("login.submitting")}
          </>
        ) : (
          <>
            <i className="fa-solid fa-arrow-right-to-bracket"></i> {t("login.submit")}
          </>
        )}
      </button>

      <p className="login-note">
        <i className="fa-solid fa-shield-halved"></i> {t("login.secureNote")}
      </p>
    </form>
  );
}
