"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { FOOTER_ICONS, footerIconClass } from "@/lib/preset-icons";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
const EMPTY_FORM = {
  id: null,
  icon_key: "",
  url: "",
  display_order: ""
};
export default function FooterIconManager() {
  const {
    t,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function load() {
    setLoading(true);
    try {
      const response = await adminFetch("/api/footer-icons", {
        cache: "no-store"
      });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.icon_key) {
      setError(t("admin.footerIcons.iconRequired"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const editing = Boolean(form.id);
    try {
      const response = await adminFetch(editing ? `/api/footer-icons/${form.id}` : "/api/footer-icons", {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          icon_key: form.icon_key,
          url: form.url,
          display_order: Number(form.display_order)
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || t("admin.state.error"));
      } else {
        setFormOpen(false);
        setForm(EMPTY_FORM);
        setSuccess(editing ? t("admin.state.saved") : t("admin.state.created"));
        await load();
        router.refresh();
      }
    } catch (err) {
      setError(t("admin.state.error"));
    }
    setSaving(false);
  }
  async function handleDelete(id) {
    if (!(await confirmAction(t("admin.footerIcons.deleteConfirm")))) return;
    const response = await adminFetch(`/api/footer-icons/${id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return setError(data?.error || t("admin.state.error"));
    if (form.id === id) setForm(EMPTY_FORM);
    setSuccess(t("admin.state.deleted"));
    await load();
    router.refresh();
  }
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(item => !term || [item.icon_key, item.url, item.display_order].filter(value => value != null).some(value => String(value).toLowerCase().includes(term)));
  }, [items, search]);
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
      <div className="admin-header"><div><h1>{t("admin.footerIcons.title")}</h1><p>{t("admin.footerIcons.subtitle")}</p></div><span className="admin-count">{items.length} {t("admin.state.total")}</span></div>
      {!formOpen && error && <div className="admin-alert error"><i className="fa-solid fa-circle-exclamation" /><span>{localizeMessage(error)}</span></div>}
        {!formOpen && success && <div className="admin-alert success"><i className="fa-solid fa-circle-check" /><span>{localizeMessage(success)}</span></div>}

      <AdminFormModal open={formOpen} title={form.id ? t("admin.form.editRecord") : t("admin.form.newRecord")} onClose={closeForm} busy={saving}>

        {error && <div className="admin-alert error"><i className="fa-solid fa-circle-exclamation" /><span>{localizeMessage(error)}</span></div>}
        {success && <div className="admin-alert success"><i className="fa-solid fa-circle-check" /><span>{localizeMessage(success)}</span></div>}
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="footer-icon">{t("admin.footerIcons.icon")}</label>
            <div className="admin-icon-picker">
              <div className={`admin-preview${form.icon_key ? "" : " placeholder"}`}>{form.icon_key === "x-twitter" ? <span className="nebulon-x-icon" aria-hidden="true">𝕏</span> : form.icon_key ? <i className={footerIconClass(form.icon_key)} /> : <i className="fa-solid fa-image" aria-hidden="true" />}</div>
              <AdminSelect id="footer-icon" value={form.icon_key} onChange={value => setForm({
              ...form,
              icon_key: value
            })} required placeholder={t("admin.form.none")} options={FOOTER_ICONS.map(icon => ({
              value: icon,
              label: icon,
              icon: icon === "x-twitter" ? <span className="nebulon-x-icon" aria-hidden="true">𝕏</span> : <i className={footerIconClass(icon)} aria-hidden="true" />
            }))} />
            </div>
          </div>
          <div className="admin-field"><label htmlFor="footer-url">{t("admin.footerIcons.url")}</label><input id="footer-url" type="url" value={form.url} onChange={event => setForm({
            ...form,
            url: event.target.value
          })} placeholder="https://" required /></div>
          <div className="admin-field"><label htmlFor="footer-order">{t("admin.form.order")}</label><input id="footer-order" type="number" min="0" placeholder="0" value={form.display_order} onChange={event => setForm({
            ...form,
            display_order: event.target.value
          })} required /></div>
          <div className="admin-field admin-field-actions full"><button className="admin-btn primary" disabled={saving || !form.id && items.length >= 9}>{saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}</button><button type="button" className="admin-btn ghost" onClick={closeForm}>{t("admin.form.cancel")}</button></div>
        </form>
      
      </AdminFormModal>
      <div className="admin-card">
<div className="admin-card-head admin-list-toolbar">
  <div className="admin-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t("admin.form.search")} aria-label={t("admin.form.search")} /></div>
  <button type="button" className="admin-btn primary" onClick={handleAdd} disabled={items.length >= 9}><i className="fa-solid fa-plus" aria-hidden="true" /> {t("admin.form.add")}</button>
</div>
        {loading ? <div className="admin-empty">{t("admin.state.loading")}</div> : filtered.length === 0 ? <div className="admin-empty">{items.length === 0 ? t("admin.footerIcons.empty") : t("admin.state.noResults")}</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.footerIcons.icon")}</th><th>{t("admin.footerIcons.url")}</th><th>{t("admin.form.order")}</th><th /></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td data-label={t("admin.footerIcons.icon")}><span className="admin-preview small">{item.icon_key === "x-twitter" ? <span className="nebulon-x-icon" aria-hidden="true">𝕏</span> : <i className={footerIconClass(item.icon_key)} />}</span></td><td data-label={t("admin.footerIcons.url")}>{item.url}</td><td data-label={t("admin.form.order")}>{item.display_order}</td><td className="admin-row-actions"><div className="admin-row-actions-inner"><button className="admin-btn ghost small" onClick={() => {
                    setError("");
                    setSuccess("");
                    setForm({
                      id: item.id,
                      icon_key: item.icon_key,
                      url: item.url,
                      display_order: item.display_order == null ? "" : String(item.display_order)
                    });
                    setFormOpen(true);
                  }}><i className="fa-solid fa-pen" /> {t("admin.form.edit")}</button><button className="admin-btn danger small" onClick={() => handleDelete(item.id)}><i className="fa-solid fa-trash" /> {t("admin.form.delete")}</button></div></td></tr>)}</tbody></table></div>}
      </div>
    </>;
}
