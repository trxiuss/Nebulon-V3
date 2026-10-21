"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordForm() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    adminFetch("/api/account", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setUserId(data?.id ?? null);
        setEmail(data?.email || "");
      })
      .catch(() => setUserId(null));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const wantsPasswordChange = Boolean(form.newPassword || form.confirmPassword || form.currentPassword);

    if (wantsPasswordChange) {
      if (form.newPassword.length < 8) {
        setError("admin.account.tooShort");
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError("admin.account.mismatch");
        return;
      }
      if (!form.currentPassword) {
        setError("admin.account.currentRequired");
        return;
      }
    }

    if (!userId) {
      setError("admin.state.error");
      return;
    }

    setSaving(true);
    try {
      const emailRes = await adminFetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const emailData = await emailRes.json().catch(() => null);
      if (!emailRes.ok) {
        setError(
          emailData?.code === "account.emailDuplicate"
            ? "admin.account.emailDuplicate"
            : emailData?.code === "account.emailInvalid"
              ? "admin.account.emailInvalid"
              : "admin.state.error"
        );
        setSaving(false);
        return;
      }

      if (wantsPasswordChange) {
        const res = await adminFetch(`/api/users/${userId}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword
          })
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(data?.code === "auth.wrongCurrent" ? "admin.account.wrongCurrent" : "admin.state.error");
          setSaving(false);
          return;
        }
        setForm(EMPTY_PASSWORDS);
      }

      setSuccess(true);
    } catch (err) {
      setError("admin.state.error");
    }
    setSaving(false);
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.account.title")}</h1>
          <p>{t("admin.account.subtitle")}</p>
        </div>
      </div>

      <div className="admin-card">
        {error && (
          <div className="admin-alert error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{t(error)}</span>
          </div>
        )}
        {success && (
          <div className="admin-alert success">
            <i className="fa-solid fa-circle-check"></i>
            <span>{t("admin.account.success")}</span>
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field full">
            <label htmlFor="account-email">{t("admin.account.email")}</label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              placeholder={t("admin.account.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <small className="admin-hint">{t("admin.account.emailHint")}</small>
          </div>

          <div className="admin-field full">
            <label htmlFor="current-password">{t("admin.account.currentPassword")}</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="new-password">{t("admin.account.newPassword")}</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              minLength={8}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="confirm-password">{t("admin.account.confirmPassword")}</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              minLength={8}
            />
          </div>

          <div className="admin-field-actions">
            <button type="submit" className="admin-btn primary" disabled={saving}>
              {saving ? t("admin.account.submitting") : t("admin.account.submit")}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
