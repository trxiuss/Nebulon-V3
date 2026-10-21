"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { hasPermission } from "@/lib/permissions";
import { safeJsonParse } from "@/lib/utils";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import { MODAL_OUT_MS } from "@/components/dashboard/hooks/useModalPresence";
import "@/components/dashboard/AuditLogManager/AuditLogManager.css";

const PAGE_SIZE = 15;

export default function AuditLogManager() {
  const { t, locale, localizeMessage } = useLanguage();
  const confirmAction = useAdminConfirm();
  const [view, setView] = useState("actions");
  const [rows, setRows] = useState([]);
  const [authRows, setAuthRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [authDetail, setAuthDetail] = useState(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailTimer = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [authAccess, setAuthAccess] = useState(false);
  const [actionsAccess, setActionsAccess] = useState(false);

  async function readJson(url) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await adminFetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok) return { ok: true, data };
        if (res.status === 401 || res.status === 403) return { ok: false, data: null };
      } catch (err) {}
    }
    return { ok: false, data: null };
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [logs, authLogs, me] = await Promise.all([
        readJson("/api/audit"),
        readJson("/api/auth-logs"),
        readJson("/api/auth/me")
      ]);
      setRows(Array.isArray(logs.data) ? logs.data : []);
      setAuthRows(Array.isArray(authLogs.data) ? authLogs.data : []);
      setActionsAccess(logs.ok && Array.isArray(logs.data));
      setAuthAccess(authLogs.ok && Array.isArray(authLogs.data));
      setPermissions((prev) => (Array.isArray(me.data?.user?.permissions) ? me.data.user.permissions : prev));
      if (!logs.ok && !authLogs.ok) setError(t("admin.state.error"));
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canDelete = hasPermission(permissions, "audit.delete");
  const canClear = hasPermission(permissions, "audit.clear");
  const canViewActions = actionsAccess || hasPermission(permissions, "audit.view");
  const canViewAuth = authAccess || hasPermission(permissions, "audit.auth.view");

  useEffect(() => {
    if (loading) return;
    if (view === "actions" && !canViewActions && canViewAuth) setView("auth");
    if (view === "auth" && !canViewAuth && canViewActions) setView("actions");
  }, [loading, view, canViewActions, canViewAuth]);

  const isAuthView = view === "auth";
  const canViewActive = isAuthView ? canViewAuth : canViewActions;
  const activeRows = canViewActive ? (isAuthView ? authRows : rows) : [];

  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
    setSuccess("");
    setError("");
  }, [view]);

  const pageItems = useMemo(() => paginate(activeRows, page, PAGE_SIZE), [activeRows, page]);

  const dateLocale = locale === "en" ? "en-GB" : "tr-TR";

  const toDate = (value) => {
    if (!value) return null;
    const date = new Date(String(value).replace(" ", "T") + "Z");
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value) => {
    const date = toDate(value);
    return date ? date.toLocaleString(dateLocale) : value || "-";
  };

  const onlyDate = (value) => {
    const date = toDate(value);
    return date ? date.toLocaleDateString(dateLocale) : value || "-";
  };

  const onlyTime = (value) => {
    const date = toDate(value);
    return date
      ? date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "-";
  };

  const renderWhen = (value) => {
    const date = toDate(value);
    if (!date) return value || "-";
    return (
      <span className="admin-audit-when">
        <span className="admin-audit-date">{date.toLocaleDateString(dateLocale)}</span>
        <span className="admin-audit-time">
          {date.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </span>
    );
  };

  const actionLabel = (action) => {
    const key = `admin.audit.action.${action}`;
    const label = t(key);
    return label === key ? action : label;
  };

  const entityLabel = (type) => {
    if (!type) return "-";
    const key = `admin.audit.entity.${type}`;
    const label = t(key);
    return label === key ? type : label;
  };

  const eventLabel = (event) => {
    const key = `admin.authlog.event.${event}`;
    const label = t(key);
    return label === key ? event || "-" : label;
  };

  const statusLabel = (status) => {
    const key = `admin.authlog.status.${status}`;
    const label = t(key);
    return label === key ? status || "-" : label;
  };

  const viewOptions = [
    canViewActions
      ? { value: "actions", label: t("admin.audit.view.actions"), iconClass: "fa-solid fa-list-check" }
      : null,
    canViewAuth
      ? { value: "auth", label: t("admin.audit.view.auth"), iconClass: "fa-solid fa-right-to-bracket" }
      : null
  ].filter(Boolean);

  async function handleDelete(id) {
    if (!canDelete) {
      setSuccess("");
      setError(t("auth.forbidden"));
      return;
    }
    const confirmKey = isAuthView ? "admin.authlog.deleteConfirm" : "admin.audit.deleteConfirm";
    if (!(await confirmAction(t(confirmKey)))) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const endpoint = isAuthView ? `/api/auth-logs/${id}` : `/api/audit/${id}`;
      const res = await adminFetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
      } else {
        if (isAuthView) {
          setAuthRows((prev) => prev.filter((row) => row.id !== id));
          if (authDetail?.id === id) setAuthDetail(null);
        } else {
          setRows((prev) => prev.filter((row) => row.id !== id));
          if (detail?.id === id) setDetail(null);
        }
        setSuccess(t("admin.state.deleted"));
      }
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setBusy(false);
  }

  async function handleClear() {
    if (!canClear) {
      setSuccess("");
      setError(t("auth.forbidden"));
      return;
    }
    const confirmKey = isAuthView ? "admin.authlog.clearConfirm" : "admin.audit.clearConfirm";
    if (!(await confirmAction(t(confirmKey)))) return;
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const endpoint = isAuthView ? "/api/auth-logs" : "/api/audit";
      const res = await adminFetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
      } else {
        setSuccess(t(isAuthView ? "admin.authlog.cleared" : "admin.audit.cleared"));
        setPage(1);
        await load();
      }
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setBusy(false);
  }

  const detailEntries = useMemo(() => {
    if (!detail) return [];
    const parsed = safeJsonParse(detail.details, null);
    if (!parsed || typeof parsed !== "object") return [];
    return Object.entries(parsed);
  }, [detail]);

  const authDetailEntries = useMemo(() => {
    if (!authDetail) return [];
    const parsed = safeJsonParse(authDetail.details, null);
    if (!parsed || typeof parsed !== "object") return [];
    return Object.entries(parsed).filter(([, value]) => value !== "" && value !== null && value !== undefined);
  }, [authDetail]);

  function closeDetail() {
    if (detailClosing) return;
    setDetailClosing(true);
    clearTimeout(detailTimer.current);
    detailTimer.current = setTimeout(() => {
      setDetail(null);
      setAuthDetail(null);
      setDetailClosing(false);
    }, MODAL_OUT_MS);
  }

  const value = (input) => (input === 0 ? "0" : input ? String(input) : "-");

  const coords = (row) =>
    row?.latitude && row?.longitude ? `${row.latitude}, ${row.longitude}` : "-";

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.audit.title")}</h1>
          <p>{t("admin.audit.subtitle")}</p>
        </div>
        <span className="admin-count">
          {activeRows.length} {t("admin.state.total")}
        </span>
      </div>

      <div className="admin-card">
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

        <div className="admin-card-head admin-audit-toolbar">
          {activeRows.length > 0 ? (
            <button type="button" className="admin-btn danger" disabled={busy} onClick={handleClear}>
              <i className="fa-solid fa-broom"></i> {t("admin.audit.clear")}
            </button>
          ) : (
            <span />
          )}
          <div className="admin-audit-view-select" hidden={viewOptions.length < 2}>
            <AdminSelect
              id="audit-view-select"
              value={view}
              onChange={(next) => setView(next)}
              options={viewOptions}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">{t("admin.state.loading")}</div>
        ) : !canViewActive ? (
          <div className="admin-empty">{t("auth.forbidden")}</div>
        ) : activeRows.length === 0 ? (
          <div className="admin-empty">
            {isAuthView ? t("admin.authlog.empty") : t("admin.audit.empty")}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-audit-table">
                <thead>
                  {isAuthView ? (
                    <tr>
                      <th>{t("admin.authlog.username")}</th>
                      <th>{t("admin.authlog.date")}</th>
                      <th>{t("admin.authlog.time")}</th>
                      <th>{t("admin.authlog.ip")}</th>
                      <th></th>
                    </tr>
                  ) : (
                    <tr>
                      <th>{t("admin.audit.user")}</th>
                      <th>{t("admin.audit.action")}</th>
                      <th>{t("admin.audit.entity")}</th>
                      <th>{t("admin.audit.date")}</th>
                      <th></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {isAuthView
                    ? pageItems.map((row) => (
                        <tr key={row.id}>
                          <td data-label={t("admin.authlog.username")}>
                            <span className="admin-audit-user">
                              <span>{row.username || "system"}</span>
                              <span className={`admin-tag ${row.status === "failed" ? "warn" : "ok"}`}>
                                {eventLabel(row.event)}
                              </span>
                            </span>
                          </td>
                          <td data-label={t("admin.authlog.date")}>{onlyDate(row.created_at)}</td>
                          <td data-label={t("admin.authlog.time")}>{onlyTime(row.created_at)}</td>
                          <td data-label={t("admin.authlog.ip")}>{value(row.ip)}</td>
                          <td className="admin-row-actions">
                            <div className="admin-row-actions-inner">
                              <button
                                type="button"
                                className="admin-btn ghost small"
                                onClick={() => setAuthDetail(row)}
                              >
                                <i className="fa-solid fa-circle-info"></i> {t("admin.authlog.detail")}
                              </button>
                              <button
                                type="button"
                                className="admin-btn danger small"
                                disabled={busy}
                                onClick={() => handleDelete(row.id)}
                              >
                                <i className="fa-solid fa-trash"></i> {t("admin.form.delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : pageItems.map((row) => (
                        <tr key={row.id}>
                          <td data-label={t("admin.audit.user")}>{row.username || "system"}</td>
                          <td data-label={t("admin.audit.action")}>{actionLabel(row.action)}</td>
                          <td data-label={t("admin.audit.entity")}>
                            {entityLabel(row.entity_type)}
                            {row.entity_id ? ` #${row.entity_id}` : ""}
                          </td>
                          <td data-label={t("admin.audit.date")}>{renderWhen(row.created_at)}</td>
                          <td className="admin-row-actions">
                            <div className="admin-row-actions-inner">
                              <button
                                type="button"
                                className="admin-btn ghost small"
                                onClick={() => setDetail(row)}
                              >
                                <i className="fa-solid fa-circle-info"></i> {t("admin.audit.detail")}
                              </button>
                              <button
                                type="button"
                                className="admin-btn danger small"
                                disabled={busy}
                                onClick={() => handleDelete(row.id)}
                              >
                                <i className="fa-solid fa-trash"></i> {t("admin.form.delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={activeRows.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {detail && typeof document !== "undefined" && createPortal(
        <div
          className={`admin-modal-backdrop admin-modal-blur${detailClosing ? " is-closing" : ""}`}
          onClick={closeDetail}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-head">
              <h2>{t("admin.audit.detailTitle")}</h2>
              <button
                type="button"
                className="admin-btn ghost small"
                onClick={closeDetail}
                aria-label={t("admin.audit.close")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <dl className="admin-detail-list">
              <div>
                <dt>{t("admin.audit.logId")}</dt>
                <dd>#{detail.id}</dd>
              </div>
              <div>
                <dt>{t("admin.audit.user")}</dt>
                <dd>
                  {detail.username || "system"}
                  {detail.user_id ? ` (#${detail.user_id})` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("admin.audit.action")}</dt>
                <dd>{actionLabel(detail.action)}</dd>
              </div>
              <div>
                <dt>{t("admin.audit.entity")}</dt>
                <dd>
                  {entityLabel(detail.entity_type)}
                  {detail.entity_id ? ` #${detail.entity_id}` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("admin.audit.date")}</dt>
                <dd>{formatDate(detail.created_at)}</dd>
              </div>
              <div>
                <dt>{t("admin.audit.ip")}</dt>
                <dd>{detail.ip || "-"}</dd>
              </div>
              <div className="full">
                <dt>{t("admin.audit.userAgent")}</dt>
                <dd>{detail.user_agent || "-"}</dd>
              </div>
              <div className="full">
                <dt>{t("admin.audit.changes")}</dt>
                <dd>
                  {detailEntries.length === 0 ? (
                    t("admin.audit.noDetails")
                  ) : (
                    <ul className="admin-detail-changes">
                      {detailEntries.map(([key, item]) => (
                        <li key={key}>
                          <span>{key}</span>
                          <code>{typeof item === "object" ? JSON.stringify(item) : String(item)}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>,
        document.body
      )}

      {authDetail && typeof document !== "undefined" && createPortal(
        <div
          className={`admin-modal-backdrop admin-modal-blur${detailClosing ? " is-closing" : ""}`}
          onClick={closeDetail}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-head">
              <h2>{t("admin.authlog.detailTitle")}</h2>
              <button
                type="button"
                className="admin-btn ghost small"
                onClick={closeDetail}
                aria-label={t("admin.audit.close")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <dl className="admin-detail-list">
              <div>
                <dt>{t("admin.authlog.recordId")}</dt>
                <dd>#{authDetail.id}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.username")}</dt>
                <dd>
                  {authDetail.username || "system"}
                  {authDetail.user_id ? ` (#${authDetail.user_id})` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("admin.authlog.event")}</dt>
                <dd>{eventLabel(authDetail.event)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.status")}</dt>
                <dd>{statusLabel(authDetail.status)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.date")}</dt>
                <dd>{onlyDate(authDetail.created_at)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.time")}</dt>
                <dd>{onlyTime(authDetail.created_at)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.ip")}</dt>
                <dd>{value(authDetail.ip)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.country")}</dt>
                <dd>
                  {value(authDetail.country)}
                  {authDetail.country_code ? ` (${authDetail.country_code})` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("admin.authlog.region")}</dt>
                <dd>{value(authDetail.region)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.city")}</dt>
                <dd>{value(authDetail.city)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.district")}</dt>
                <dd>{value(authDetail.district)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.postal")}</dt>
                <dd>{value(authDetail.postal_code)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.coords")}</dt>
                <dd>{coords(authDetail)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.timezone")}</dt>
                <dd>{value(authDetail.timezone)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.asn")}</dt>
                <dd>{value(authDetail.asn)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.isp")}</dt>
                <dd>{value(authDetail.isp)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.browser")}</dt>
                <dd>
                  {value(authDetail.browser)}
                  {authDetail.browser_version ? ` ${authDetail.browser_version}` : ""}
                </dd>
              </div>
              <div>
                <dt>{t("admin.authlog.os")}</dt>
                <dd>{value(authDetail.os)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.device")}</dt>
                <dd>{value(authDetail.device_type)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.platform")}</dt>
                <dd>{value(authDetail.platform)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.language")}</dt>
                <dd>{value(authDetail.language)}</dd>
              </div>
              <div>
                <dt>{t("admin.authlog.protocol")}</dt>
                <dd>{value(authDetail.protocol)}</dd>
              </div>
              <div className="full">
                <dt>{t("admin.authlog.referer")}</dt>
                <dd>{value(authDetail.referer)}</dd>
              </div>
              <div className="full">
                <dt>{t("admin.authlog.userAgent")}</dt>
                <dd>{value(authDetail.user_agent)}</dd>
              </div>
              <div className="full">
                <dt>{t("admin.authlog.extra")}</dt>
                <dd>
                  {authDetailEntries.length === 0 ? (
                    t("admin.authlog.noDetails")
                  ) : (
                    <ul className="admin-detail-changes">
                      {authDetailEntries.map(([key, item]) => (
                        <li key={key}>
                          <span>{key}</span>
                          <code>{typeof item === "object" ? JSON.stringify(item) : String(item)}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
