"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import "@/components/dashboard/UserManager/UserManager.css";
const EMPTY_FORM = {
  id: null,
  username: "",
  email: "",
  password: "",
  role: "yonetici",
  fullAccess: false
};
export default function UserManager() {
  const {
    t,
    locale,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOwnerActor, setIsOwnerActor] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState([]);
  async function load() {
    setLoading(true);
    try {
      const [usersRes, meRes, rolesRes] = await Promise.all([adminFetch("/api/users", {
        cache: "no-store"
      }), adminFetch("/api/auth/me", {
        cache: "no-store"
      }), adminFetch("/api/roles", {
        cache: "no-store"
      })]);
      const usersData = await usersRes.json();
      const meData = await meRes.json().catch(() => null);
      const rolesData = await rolesRes.json().catch(() => []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentUserId(meData?.user?.id ?? null);
      setIsOwnerActor(Boolean(meData?.user?.isSystemAdmin));
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(user => [user.username, user.email].filter(Boolean).some(value => value.toLowerCase().includes(term)));
  }, [users, search]);
  useEffect(() => {
    setPage(1);
  }, [search]);
  const pageItems = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  const ownerCount = useMemo(() => users.filter(u => u.role === "yonetici").length, [users]);
  function isLastOwner(user) {
    return user.role === "yonetici" && ownerCount <= 1;
  }
  const editingLastOwner = Boolean(form.id && users.some(user => Number(user.id) === Number(form.id) && isLastOwner(user)));
  function renderWhen(value) {
    if (!value) return "-";
    const date = new Date(String(value).replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return value;
    const dateLocale = locale === "en" ? "en-GB" : "tr-TR";
    return <span className="admin-when">
        <span className="admin-when-date">
          {date.toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        })}
        </span>
        <span className="admin-when-time">
          {date.toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })}
        </span>
      </span>;
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const editing = Boolean(form.id);
    const url = editing ? `/api/users/${form.id}` : "/api/users";
    const payload = {
      username: form.username,
      email: form.email,
      role: form.role
    };
    if (isOwnerActor) payload.fullAccess = form.role === "yonetici" ? true : form.fullAccess;
    if (!editing) payload.password = form.password;
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
        setSaving(false);
        return;
      }
      if (editing && form.password.trim()) {
        const passwordRes = await adminFetch(`/api/users/${form.id}/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            newPassword: form.password
          })
        });
        const passwordData = await passwordRes.json().catch(() => null);
        if (!passwordRes.ok) {
          setError(passwordData?.error || t("admin.state.error"));
          setSaving(false);
          return;
        }
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setSuccess(editing ? t("admin.state.saved") : t("admin.state.created"));
      await load();
      router.refresh();
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!(await confirmAction(t("admin.users.deleteConfirm")))) return;
    setError("");
    const res = await adminFetch(`/api/users/${id}`, {
      method: "DELETE"
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || t("admin.state.error"));
      return;
    }
    if (form.id === id) setForm(EMPTY_FORM);
    setSuccess(t("admin.state.deleted"));
    await load();
    router.refresh();
  }
  function handleEdit(user) {
    setError("");
    setFormOpen(true);
    setSuccess("");
    setForm({
      id: user.id,
      username: user.username,
      email: user.email || "",
      password: "",
      role: user.role,
      fullAccess: Boolean(user.full_access)
    });
  }
  function roleLabel(role) {
    const found = roles.find(r => r.slug === role);
    if (found) return found.name;
    if (role === "yonetici") return t("admin.users.roleOwner");
    return role || "-";
  }
  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  }
  function handleAdd() {
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }
  return <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.users.title")}</h1>
          <p>{t("admin.users.subtitle")}</p>
        </div>
        <span className="admin-count">
          {users.length} {t("admin.state.total")}
        </span>
      </div>

      {!formOpen && error && <div className="admin-alert error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{localizeMessage(error)}</span>
          </div>}
        {!formOpen && success && <div className="admin-alert success">
            <i className="fa-solid fa-circle-check"></i>
            <span>{localizeMessage(success)}</span>
          </div>}

      <AdminFormModal open={formOpen} title={form.id ? t("admin.form.editRecord") : t("admin.form.newRecord")} onClose={closeForm} busy={saving}>


        {error && <div className="admin-alert error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{localizeMessage(error)}</span>
          </div>}
        {success && <div className="admin-alert success">
            <i className="fa-solid fa-circle-check"></i>
            <span>{localizeMessage(success)}</span>
          </div>}

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="user-name">{t("admin.users.username")}</label>
            <input id="user-name" type="text" autoComplete="off" value={form.username} onChange={event => setForm({
            ...form,
            username: event.target.value
          })} required />
          </div>

          <div className="admin-field">
            <label htmlFor="user-email">{t("admin.users.email")}</label>
            <input id="user-email" type="email" autoComplete="off" value={form.email} onChange={event => setForm({
            ...form,
            email: event.target.value
          })} />
          </div>

          {!form.id && <div className="admin-field">
              <label htmlFor="user-password">{t("admin.users.password")}</label>
              <input id="user-password" type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({
            ...form,
            password: event.target.value
          })} minLength={8} required />
              <small>{t("admin.users.passwordHint")}</small>
            </div>}

          <div className="admin-field">
            <label htmlFor="user-role">{t("admin.users.role")}</label>
            <AdminSelect id="user-role" value={form.role} onChange={value => setForm({
            ...form,
            role: value
          })} options={roles.map(role => ({
            value: role.slug,
            label: role.name
          }))} />
          </div>

          {form.id && <div className="admin-field">
              <label htmlFor="user-password">{t("admin.users.newPassword")}</label>
              <input id="user-password" type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({
            ...form,
            password: event.target.value
          })} minLength={8} />
              <small>{t("admin.users.passwordHint")}</small>
            </div>}

          <div className="admin-field admin-field-actions full">
            <button type="submit" className="admin-btn primary" disabled={saving}>
              {saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}
            </button>
            <button type="button" className="admin-btn ghost" onClick={closeForm}>
                {t("admin.form.cancel")}
              </button>
            <div className="admin-switch-slot">
              <label className={`admin-switch${!isOwnerActor || form.role === "yonetici" ? " is-disabled" : ""}`} title={t("admin.users.fullAccessHint")}>
                <span className="admin-switch-label">{t("admin.users.fullAccess")}</span>
                <input type="checkbox" role="switch" checked={form.role === "yonetici" ? true : Boolean(form.fullAccess)} disabled={!isOwnerActor || form.role === "yonetici"} onChange={event => setForm({
                ...form,
                fullAccess: event.target.checked
              })} />
                <span className="admin-switch-track" aria-hidden="true">
                  <span className="admin-switch-thumb"></span>
                </span>
              </label>
            </div>
          </div>
        </form>
      
      </AdminFormModal>

      <div className="admin-card">
        <div className="admin-card-head admin-list-toolbar">
  <div className="admin-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t("admin.form.search")} aria-label={t("admin.form.search")} /></div>
  <button type="button" className="admin-btn primary" onClick={handleAdd}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("admin.form.add")}</button>
</div>

        {loading ? <div className="admin-empty">{t("admin.state.loading")}</div> : filtered.length === 0 ? <div className="admin-empty">
            {users.length === 0 ? t("admin.users.empty") : t("admin.state.noResults")}
          </div> : <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.users.username")}</th>
                  <th>{t("admin.users.email")}</th>
                  <th>{t("admin.users.role")}</th>
                  <th>{t("admin.users.createdAt")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(user => <tr key={user.id}>
                    <td data-label={t("admin.users.username")}>
                      <span className="admin-user-cell">
                        <span>{user.username}</span>
                        {Number(user.id) === Number(currentUserId) && <span className="admin-tag">{t("admin.users.you")}</span>}
                        {(user.full_access || user.role === "yonetici") && <span className="admin-tag ok">{t("admin.users.fullAccessTag")}</span>}
                        {user.needs_password_upgrade && <span className="admin-tag warn" title={t("admin.users.legacyHashHint")}>
                            <i className="fa-solid fa-triangle-exclamation"></i> {t("admin.users.legacyHash")}
                          </span>}
                      </span>
                    </td>
                    <td data-label={t("admin.users.email")}>{user.email || "-"}</td>
                    <td data-label={t("admin.users.role")}>{roleLabel(user.role)}</td>
                    <td data-label={t("admin.users.createdAt")}>{renderWhen(user.created_at)}</td>
                    <td className="admin-row-actions">
                      <button className="admin-btn ghost small" onClick={() => handleEdit(user)}>
                        <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                      </button>
                      <button className="admin-btn danger small" onClick={() => handleDelete(user.id)} disabled={Number(user.id) === Number(currentUserId) || isLastOwner(user)} title={Number(user.id) === Number(currentUserId) ? t("admin.users.cannotDeleteSelf") : isLastOwner(user) ? t("admin.users.cannotDeleteLastOwner") : undefined}>
                        <i className="fa-solid fa-trash"></i> {t("admin.form.delete")}
                      </button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </>}
      </div>
    </>;
}
