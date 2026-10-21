"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import useAdminPermissions, { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import "@/components/dashboard/RoleManager/RoleManager.css";
const EMPTY_FORM = {
  id: null,
  name: "",
  slug: "",
  rank: "",
  version: null,
  permissions: []
};
export default function RoleManager() {
  const {
    t,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const live = useAdminPermissions();
  const me = useMemo(() => ({
    role: live.role,
    roleRank: live.roleRank,
    fullAccess: live.fullAccess,
    permissions: live.permissions
  }), [live.role, live.roleRank, live.fullAccess, live.permissions]);
  const privileged = Boolean(me?.fullAccess) || me?.role === "yonetici";
  const myPermissions = useMemo(() => {
    const list = Array.isArray(me?.permissions) ? me.permissions : [];
    return list.includes("*") ? ALL_PERMISSION_KEYS : list;
  }, [me]);
  const myRank = Number.isFinite(Number(me?.roleRank)) ? Number(me.roleRank) : 999;
  const minRank = privileged ? me?.role === "yonetici" ? 0 : 1 : myRank + 1;
  function canGrant(key) {
    return privileged || myPermissions.includes(key);
  }
  function canEditRole(role) {
    if (role.is_system) return false;
    if (privileged) return true;
    if (role.slug === me?.role) return false;
    return Number(role.rank) > myRank;
  }
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await adminFetch("/api/roles");
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setError(t("admin.state.error"));
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!live.loaded) return;
    load(true).then(fresh => {
      setForm(prev => {
        if (!prev.id) return prev;
        const current = fresh.find(role => Number(role.id) === Number(prev.id));
        if (!current) return EMPTY_FORM;
        if (Number(current.version) === Number(prev.version)) return prev;
        return {
          id: current.id,
          name: current.name,
          slug: current.slug,
          rank: Number.isFinite(Number(current.rank)) ? Number(current.rank) : "",
          version: Number(current.version),
          permissions: Array.isArray(current.permissions) ? [...current.permissions] : []
        };
      });
    });
  }, [live.stamp, live.epoch, live.loaded]);
  function togglePerm(key) {
    if (!canGrant(key)) return;
    setForm(prev => {
      const has = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter(p => p !== key) : [...prev.permissions, key]
      };
    });
  }
  function toggleGroup(groupKeys) {
    const keys = groupKeys.filter(k => canGrant(k));
    if (keys.length === 0) return;
    setForm(prev => {
      const groupKeys = keys;
      const allOn = groupKeys.every(k => prev.permissions.includes(k));
      if (allOn) {
        return {
          ...prev,
          permissions: prev.permissions.filter(p => !groupKeys.includes(p))
        };
      }
      const set = new Set([...prev.permissions, ...groupKeys]);
      return {
        ...prev,
        permissions: ALL_PERMISSION_KEYS.filter(k => set.has(k))
      };
    });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const editing = Boolean(form.id);
    const url = editing ? `/api/roles/${form.id}` : "/api/roles";
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          rank: form.rank === "" ? 0 : Number(form.rank),
          permissions: form.permissions,
          ...(editing && form.version !== null ? {
            version: Number(form.version)
          } : {})
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
        if (res.status === 409 || res.status === 403) await load(true);
        setSaving(false);
        return;
      }
      setFormOpen(false);
      setSuccess(editing ? t("admin.state.saved") : t("admin.state.created"));
      setForm(EMPTY_FORM);
      setReadOnly(false);
      await load();
      router.refresh();
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!(await confirmAction(t("admin.roles.deleteConfirm")))) return;
    setError("");
    setSuccess("");
    try {
      const res = await adminFetch(`/api/roles/${id}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
        return;
      }
      setSuccess(t("admin.state.deleted"));
      if (form.id === id) setForm(EMPTY_FORM);
      await load();
      router.refresh();
    } catch (err) {
      setError(t("admin.state.error"));
    }
  }
  function startView(role) {
    setFormOpen(true);
    setForm({
      id: role.id,
      name: role.name,
      slug: role.slug,
      rank: Number.isFinite(Number(role.rank)) ? Number(role.rank) : "",
      version: Number(role.version),
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    });
    setReadOnly(true);
    setError("");
    setSuccess("");
  }
  function startEdit(role) {
    setFormOpen(true);
    setReadOnly(false);
    setForm({
      id: role.id,
      name: role.name,
      slug: role.slug,
      rank: Number.isFinite(Number(role.rank)) ? Number(role.rank) : "",
      version: Number(role.version),
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    });
    setError("");
    setSuccess("");
  }
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roles.filter(item => !term || [item.name, item.slug, item.rank].filter(value => value != null).some(value => String(value).toLowerCase().includes(term)));
  }, [roles, search]);
  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setReadOnly(false);
    setError("");
    setSuccess("");
  }
  function handleAdd() {
    setForm(EMPTY_FORM);
    setReadOnly(false);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }
  return <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.roles.title")}</h1>
          <p>{t("admin.roles.subtitle")}</p>
        </div>
      </div>

      {!formOpen && error && <div className="admin-alert error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{localizeMessage(error)}</span>
          </div>}
        {!formOpen && success && <div className="admin-alert success">
            <i className="fa-solid fa-circle-check"></i>
            <span>{localizeMessage(success)}</span>
          </div>}

      <AdminFormModal open={formOpen} title={readOnly ? t("admin.form.viewRecord") : form.id ? t("admin.form.editRecord") : t("admin.form.newRecord")} onClose={closeForm} busy={saving}>


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
            <label htmlFor="role-name">{t("admin.roles.name")}</label>
            <input id="role-name" type="text" value={form.name} onChange={event => {
            const value = event.target.value;
            setForm(prev => ({
              ...prev,
              name: value,
              slug: prev.id ? prev.slug : slugify(value)
            }));
          }} required disabled={readOnly} />
          </div>

          <div className="admin-field">
            <label htmlFor="role-slug">{t("admin.roles.slug")}</label>
            <input id="role-slug" type="text" value={form.slug} onChange={event => setForm({
            ...form,
            slug: slugify(event.target.value)
          })} required disabled={readOnly || Boolean(form.id && roles.find(r => r.id === form.id)?.is_system)} />
          </div>

          <div className="admin-field">
            <label htmlFor="role-rank">{t("admin.roles.rank")}</label>
            <input id="role-rank" type="number" min={minRank} max="999" placeholder="0" value={form.rank} onChange={event => setForm({
            ...form,
            rank: event.target.value
          })} disabled={readOnly || Boolean(form.id && roles.find(r => r.id === form.id)?.is_system)} />
            <small className="admin-hint">{t("admin.roles.rankHint")}</small>
          </div>

          <div className="admin-field full">
            <label>{t("admin.roles.permissions")}</label>
            <div className="admin-permission-grid">
              {PERMISSION_GROUPS.map(group => {
              const grantable = group.perms.filter(k => canGrant(k));
              const checkSource = grantable.length > 0 ? grantable : group.perms;
              const allOn = checkSource.length > 0 && checkSource.every(k => form.permissions.includes(k));
              return <div key={group.key} className="admin-permission-group">
                    <label className="admin-checkbox admin-permission-head">
                      <input type="checkbox" checked={allOn} disabled={readOnly || !group.perms.some(k => canGrant(k))} onChange={() => toggleGroup(group.perms)} />
                      <span>{t(`perm.group.${group.key}`)}</span>
                    </label>
                    <div className="admin-permission-items">
                      {group.perms.map(key => <label key={key} className="admin-checkbox">
                          <input type="checkbox" checked={form.permissions.includes(key)} disabled={readOnly || !canGrant(key)} onChange={() => togglePerm(key)} />
                          <span>{t(`perm.${key}`)}</span>
                        </label>)}
                    </div>
                  </div>;
            })}
            </div>
          </div>

          <div className="admin-field-actions">
            {!readOnly && <button type="submit" className="admin-btn primary" disabled={saving}>
              {saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}
            </button>}
            <button type="button" className="admin-btn ghost" onClick={closeForm}>
                {t("admin.form.cancel")}
              </button>
          </div>
        </form>
      
      </AdminFormModal>

      <div className="admin-card admin-role-list-card">
<div className="admin-card-head admin-list-toolbar">
  <div className="admin-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t("admin.form.search")} aria-label={t("admin.form.search")} /></div>
  <button type="button" className="admin-btn primary" onClick={handleAdd}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("admin.form.add")}</button>
</div>
        {loading ? <div className="admin-empty">{t("admin.state.loading")}</div> : filtered.length === 0 ? <div className="admin-empty">{roles.length === 0 ? t("admin.roles.empty") : t("admin.state.noResults")}</div> : <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.roles.name")}</th>
                  <th>{t("admin.roles.slug")}</th>
                  <th>{t("admin.roles.rankShort")}</th>
                  <th>{t("admin.roles.permissions")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(role => <tr key={role.id}>
                    <td data-label={t("admin.roles.name")}>
                      {role.name}
                      {role.is_system ? <span className="admin-tag ok" style={{
                  marginLeft: 8
                }}>
                          {t("admin.roles.system")}
                        </span> : null}
                    </td>
                    <td data-label={t("admin.roles.slug")}>{role.slug}</td>
                    <td data-label={t("admin.roles.rankShort")}>{Number.isFinite(Number(role.rank)) ? Number(role.rank) : 100}</td>
                    <td data-label={t("admin.roles.permissions")}>{Array.isArray(role.permissions) ? role.permissions.length : 0}</td>
                    <td className="admin-row-actions">
                      <div className="admin-row-actions-inner">
                      {canEditRole(role) ? <button type="button" className="admin-btn ghost small" onClick={() => startEdit(role)}>
                          <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                        </button> : <button type="button" className="admin-btn ghost small" onClick={() => startView(role)}>
                          <i className="fa-solid fa-eye"></i> {t("admin.form.view")}
                        </button>}
                      {canEditRole(role) && <button type="button" className="admin-btn danger small" onClick={() => handleDelete(role.id)}>
                          <i className="fa-solid fa-trash"></i> {t("admin.form.delete")}
                        </button>}
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </>;
}
