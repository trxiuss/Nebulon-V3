"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";

function CardAlerts({ error, success, localizeMessage }) {
  return (
    <>
      {error && (
        <div className="admin-alert error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{localizeMessage(error)}</span>
        </div>
      )}
      {success && (
        <div className="admin-alert success">
          <i className="fa-solid fa-circle-check"></i>
          <span>{localizeMessage(success)}</span>
        </div>
      )}
    </>
  );
}

export default function SettingsManager() {
  const { t, localizeMessage } = useLanguage();
  const confirmAction = useAdminConfirm();

  const [deeplKey, setDeeplKey] = useState("");
  const [masked, setMasked] = useState("");
  const [isSet, setIsSet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tsSite, setTsSite] = useState("");
  const [tsSecret, setTsSecret] = useState("");
  const [tsEnabled, setTsEnabled] = useState(false);
  const [tsSiteMasked, setTsSiteMasked] = useState("");
  const [tsSecretMasked, setTsSecretMasked] = useState("");
  const [tsSaving, setTsSaving] = useState(false);
  const [tsError, setTsError] = useState("");
  const [tsSuccess, setTsSuccess] = useState("");

  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await adminFetch("/api/settings", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
        setLoading(false);
        return;
      }
      setIsSet(Boolean(data?.deepl_api_key_set));
      setMasked(data?.deepl_api_key_masked || "");
      setCanEdit(Boolean(data?.can_edit));
      setDeeplKey("");
      setTsEnabled(Boolean(data?.turnstile_enabled));
      setTsSiteMasked(data?.turnstile_site_key_masked || "");
      setTsSecretMasked(data?.turnstile_secret_masked || "");
      setTsSite("");
      setTsSecret("");
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function putSettings(body) {
    const res = await adminFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  }

  async function saveDeepl(body) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { ok, data } = await putSettings(body);
      if (!ok) {
        setError(data?.error || t("admin.state.error"));
        setSaving(false);
        return;
      }
      setSuccess(t("admin.state.saved"));
      await load();
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setSaving(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;
    if (!deeplKey.trim()) {
      setSuccess("");
      setError(t("admin.settings.deeplEnterKey"));
      return;
    }
    saveDeepl({ deepl_api_key: deeplKey });
  }

  async function handleDeeplDisable() {
    if (!canEdit) return;
    const ok = await confirmAction(t("admin.settings.deeplDisableConfirm"), {
      confirmLabel: t("admin.settings.turnstileDisableLabel")
    });
    if (!ok) return;
    saveDeepl({ deepl_clear: true });
  }

  async function saveTurnstile(payload) {
    setTsSaving(true);
    setTsError("");
    setTsSuccess("");
    try {
      const { ok, data } = await putSettings({ turnstile: payload });
      if (!ok) {
        setTsError(data?.error || t("admin.state.error"));
        setTsSaving(false);
        return;
      }
      setTsSuccess(t("admin.state.saved"));
      await load();
    } catch (err) {
      setTsError(t("admin.state.error"));
    }
    setTsSaving(false);
  }

  function handleTurnstileSubmit(event) {
    event.preventDefault();
    if (!canEdit) return;
    if (tsEnabled && !tsSite.trim() && !tsSecret.trim()) {
      setTsSuccess("");
      setTsError(t("admin.settings.turnstileEnterKey"));
      return;
    }
    saveTurnstile({ site_key: tsSite, secret_key: tsSecret });
  }

  async function handleTurnstileDisable() {
    if (!canEdit) return;
    const ok = await confirmAction(t("admin.settings.turnstileDisableConfirm"), {
      confirmLabel: t("admin.settings.turnstileDisableLabel")
    });
    if (!ok) return;
    saveTurnstile({ disable: true });
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.settings.title")}</h1>
          <p>{t("admin.settings.subtitle")}</p>
        </div>
      </div>

      <div className="admin-card">
        <CardAlerts error={error} success={success} localizeMessage={localizeMessage} />

        {loading ? (
          <div className="admin-empty">{t("admin.state.loading")}</div>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field full">
              <label htmlFor="deepl-key">{t("admin.settings.deeplKey")}</label>
              <small>
                {isSet
                  ? `${t("admin.settings.deeplSet")}: ${masked}`
                  : t("admin.settings.deeplEmpty")}
              </small>
              <input
                id="deepl-key"
                type="password"
                autoComplete="off"
                value={deeplKey}
                onChange={(event) => setDeeplKey(event.target.value)}
                placeholder={t("admin.settings.deeplPlaceholder")}
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <div className="admin-field-actions">
                <button type="submit" className="admin-btn primary" disabled={saving}>
                  {saving ? t("admin.form.saving") : isSet ? t("admin.form.update") : t("admin.form.save")}
                </button>
                {isSet && (
                  <button type="button" className="admin-btn danger" onClick={handleDeeplDisable} disabled={saving}>
                    {t("admin.settings.deeplDisable")}
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {!loading && (
        <div className="admin-card ts-card" style={{ marginTop: "1rem" }}>
          <CardAlerts error={tsError} success={tsSuccess} localizeMessage={localizeMessage} />

          <div className="admin-field full ts-head">
            <label>
              {t("admin.settings.turnstileTitle")}{" "}
              <span className={`admin-tag ${tsEnabled ? "ok" : ""}`}>
                {tsEnabled ? t("admin.settings.turnstileActive") : t("admin.settings.turnstileOff")}
              </span>
            </label>
          </div>

          <form className="admin-form" onSubmit={handleTurnstileSubmit}>
            <div className="admin-field full ts-field">
              <label htmlFor="ts-site">{t("admin.settings.turnstileSiteKey")}</label>
              <small>
                {tsEnabled
                  ? `${t("admin.settings.turnstileSiteSet")}: ${tsSiteMasked}`
                  : t("admin.settings.deeplEmpty")}
              </small>
              <input
                id="ts-site"
                type="password"
                autoComplete="new-password"
                value={tsSite}
                onChange={(event) => setTsSite(event.target.value)}
                placeholder={t("admin.settings.turnstileSitePlaceholder")}
                disabled={!canEdit}
              />
            </div>

            <div className="admin-field full ts-field">
              <label htmlFor="ts-secret">{t("admin.settings.turnstileSecretKey")}</label>
              <small>
                {tsEnabled
                  ? `${t("admin.settings.turnstileSecretSet")}: ${tsSecretMasked}`
                  : t("admin.settings.deeplEmpty")}
              </small>
              <input
                id="ts-secret"
                type="password"
                autoComplete="new-password"
                value={tsSecret}
                onChange={(event) => setTsSecret(event.target.value)}
                placeholder={t("admin.settings.turnstileSecretPlaceholder")}
                disabled={!canEdit}
              />
              <small>{t("admin.settings.turnstileHint")}</small>
            </div>

            {canEdit && (
              <div className="admin-field-actions">
                <button type="submit" className="admin-btn primary" disabled={tsSaving}>
                  {tsSaving
                    ? t("admin.form.saving")
                    : tsEnabled
                      ? t("admin.form.update")
                      : t("admin.settings.turnstileSave")}
                </button>
                {tsEnabled && (
                  <button type="button" className="admin-btn danger" onClick={handleTurnstileDisable} disabled={tsSaving}>
                    {t("admin.settings.turnstileDisable")}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
