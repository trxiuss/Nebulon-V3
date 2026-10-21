"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import ImageUrlField from "@/components/dashboard/ImageUrlField/ImageUrlField";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import { SOCIAL_KEYS } from "@/lib/utils";
import ManualTranslateModal from "@/components/dashboard/ManualTranslateModal/ManualTranslateModal";
import useAdminPermissions, { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import "@/components/dashboard/TeamManager/TeamManager.css";
const EMPTY_MANUAL = {
  role_en: ""
};
const EMPTY_FORM = {
  id: null,
  name: "",
  role_tr: "",
  avatar_url: "",
  socials: {
    discord: "",
    github: "",
    modrinth: "",
    instagram: ""
  },
  social_order: [...SOCIAL_KEYS],
  display_order: ""
};
function orderedSocialKeys(list) {
  const base = Array.isArray(list) ? list.filter(key => SOCIAL_KEYS.includes(key)) : [];
  const seen = [];
  for (const key of base) if (!seen.includes(key)) seen.push(key);
  for (const key of SOCIAL_KEYS) if (!seen.includes(key)) seen.push(key);
  return seen;
}
export default function TeamManager() {
  const {
    t,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [translating, setTranslating] = useState(false);
  const {
    can
  } = useAdminPermissions();
  const canManual = can("translate.manual");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEnabled, setManualEnabled] = useState(false);
  const [manualValues, setManualValues] = useState(EMPTY_MANUAL);
  useEffect(() => {
    if (canManual) return;
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
  }, [canManual]);
  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/team", {
        cache: "no-store"
      });
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
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
    if (!term) return members;
    return members.filter(member => [member.name, member.role_tr, member.role_en].filter(Boolean).some(v => v.toLowerCase().includes(term)));
  }, [members, search]);
  useEffect(() => {
    setPage(1);
  }, [search]);
  const pageItems = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  async function requestTranslate(fields) {
    if (manualEnabled) {
      setSuccess("");
      setError(t("admin.translate.autoOff"));
      return;
    }
    setTranslating(true);
    setError("");
    setSuccess("");
    try {
      let any = false;
      let preview = "";
      for (const field of fields) {
        const value = (form[field] || "").trim();
        if (!value) continue;
        any = true;
        const res = await adminFetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: value
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setError(data?.error || t("admin.translate.error"));
          setTranslating(false);
          return;
        }
        if (!preview) preview = data.en;
      }
      if (!any) {
        setError(t("admin.translate.empty"));
        setTranslating(false);
        return;
      }
      setSuccess(t("admin.translate.success") + (preview ? ` → ${preview}` : ""));
    } catch (err) {
      setError(t("admin.translate.error"));
    }
    setTranslating(false);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const editing = Boolean(form.id);
    const url = editing ? `/api/team/${form.id}` : "/api/team";
    const socials = {};
    for (const key of orderedSocialKeys(form.social_order)) {
      if (form.socials[key]?.trim()) socials[key] = form.socials[key].trim();
    }
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          role_tr: form.role_tr,
          avatar_url: form.avatar_url,
          socials,
          display_order: Number(form.display_order),
          manual_en: manualEnabled,
          role_en: manualEnabled ? manualValues.role_en : undefined
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || t("admin.state.error"));
        setSaving(false);
        return;
      }
      resetAll();
      setSuccess(editing ? t("admin.state.saved") : t("admin.state.created"));
      await load();
      router.refresh();
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!(await confirmAction(t("admin.team.deleteConfirm")))) return;
    setError("");
    const res = await adminFetch(`/api/team/${id}`, {
      method: "DELETE"
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || t("admin.state.error"));
      return;
    }
    if (form.id === id) resetAll();
    setSuccess(t("admin.state.deleted"));
    await load();
    router.refresh();
  }
  function resetAll() {
    setFormOpen(false);
    setManualOpen(false);
    setForm(EMPTY_FORM);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
  }
  function moveSocial(index, direction) {
    setForm(prev => {
      const list = orderedSocialKeys(prev.social_order);
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return {
        ...prev,
        social_order: next
      };
    });
  }
  function handleEdit(member) {
    setError("");
    setFormOpen(true);
    setSuccess("");
    setForm({
      id: member.id,
      name: member.name,
      role_tr: member.role_tr || "",
      avatar_url: member.avatar_url || "",
      socials: {
        discord: member.socials?.discord || "",
        github: member.socials?.github || "",
        modrinth: member.socials?.modrinth || "",
        instagram: member.socials?.instagram || ""
      },
      social_order: orderedSocialKeys(Object.keys(member.socials || {})),
      display_order: member.display_order === null || member.display_order === undefined ? "" : String(member.display_order)
    });
    setManualEnabled(false);
    setManualValues({
      role_en: member.role_en || ""
    });
  }
  function closeForm() {
    if (saving || translating) return;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
    setError("");
    setSuccess("");
  }
  function handleAdd() {
    setForm(EMPTY_FORM);
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }
  return <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.team.title")}</h1>
          <p>{t("admin.team.subtitle")}</p>
        </div>
        <span className="admin-count">
          {members.length} {t("admin.state.total")}
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

      <AdminFormModal open={formOpen} title={form.id ? t("admin.form.editRecord") : t("admin.form.newRecord")} onClose={closeForm} busy={saving || translating}>


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
            <label htmlFor="team-name">{t("admin.team.name")}</label>
            <input id="team-name" type="text" value={form.name} onChange={event => setForm({
            ...form,
            name: event.target.value
          })} required />
          </div>

          <div className="admin-field">
            <label htmlFor="team-role">{t("admin.team.role")}</label>
            <input id="team-role" type="text" value={form.role_tr} onChange={event => setForm({
            ...form,
            role_tr: event.target.value
          })} />
          </div>

          <ManualTranslateModal allowed={canManual} open={manualOpen} enabled={manualEnabled} values={manualValues} fields={[{
          key: "role_en",
          label: `${t("admin.team.role")} (EN)`
        }]} onClose={() => setManualOpen(false)} onApply={(enabled, values) => {
          setManualEnabled(enabled);
          setManualValues(values);
          setError("");
          setSuccess(enabled ? t("admin.manual.applied") : t("admin.manual.cleared"));
        }} />

          <div className="admin-field">
            <label htmlFor="team-order">{t("admin.form.order")}</label>
            <input id="team-order" type="number" value={form.display_order} onChange={event => setForm({
            ...form,
            display_order: event.target.value
          })} placeholder="0" min={0} required />
          </div>

          <ImageUrlField label={t("admin.team.image")} value={form.avatar_url} onChange={value => setForm({
          ...form,
          avatar_url: value
        })} round />

          <div className="admin-field full">
            <label>{t("admin.team.socials")}</label>
            <small>{t("admin.team.socialsHint")}</small>
            <div className="admin-social-grid">
              {orderedSocialKeys(form.social_order).map((key, index, list) => <div className="admin-social-row" key={key}>
                  <div className="admin-social-move">
                    <button type="button" className="admin-icon-btn tiny" disabled={index === 0} onClick={() => moveSocial(index, -1)} title={t("admin.form.moveUp")} aria-label={t("admin.form.moveUp")}>
                      <i className="fa-solid fa-chevron-up"></i>
                    </button>
                    <button type="button" className="admin-icon-btn tiny" disabled={index === list.length - 1} onClick={() => moveSocial(index, 1)} title={t("admin.form.moveDown")} aria-label={t("admin.form.moveDown")}>
                      <i className="fa-solid fa-chevron-down"></i>
                    </button>
                  </div>
                  <input type="url" placeholder={key} value={form.socials[key]} onChange={event => setForm({
                ...form,
                socials: {
                  ...form.socials,
                  [key]: event.target.value
                }
              })} />
                </div>)}
            </div>
          </div>

          <div className="admin-field-actions admin-form-footer">
            <div className="admin-save-actions">
              <button type="submit" className="admin-btn primary" disabled={saving}>{saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}</button>
              <button type="button" className="admin-btn ghost" onClick={closeForm}>{t("admin.form.cancel")}</button>
            </div>
            <div className="admin-translate-row">
              <button type="button" className={`admin-icon-btn${manualEnabled ? " is-active" : ""}`} onClick={() => setManualOpen(true)} title={t("admin.manual.open")} aria-label={t("admin.manual.open")}><i className="fa-solid fa-pen-to-square"></i></button>
              <button type="button" className="admin-btn ghost" disabled={translating || manualEnabled} title={manualEnabled ? t("admin.translate.autoOff") : ""} onClick={() => requestTranslate(["role_tr"])}><i className="fa-solid fa-language"></i>{" "}{translating ? t("admin.translate.loading") : t("admin.translate.btn")}</button>
              {manualEnabled && <span className="admin-tag ok">{t("admin.manual.active")}</span>}
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
            {members.length === 0 ? t("admin.team.empty") : t("admin.state.noResults")}
          </div> : <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.team.name")}</th>
                  <th>{t("admin.team.role")}</th>
                  <th>{t("admin.form.order")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(member => <tr key={member.id}>
                    <td data-label={t("admin.team.name")}>{member.name}</td>
                    <td data-label={t("admin.team.role")}>{member.role_tr || "-"}</td>
                    <td data-label={t("admin.form.order")}>
                      {member.display_order === null || member.display_order === undefined ? "-" : member.display_order}
                    </td>
                    <td className="admin-row-actions">
                      <button className="admin-btn ghost small" onClick={() => handleEdit(member)}>
                        <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                      </button>
                      <button className="admin-btn danger small" onClick={() => handleDelete(member.id)}>
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
