"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { CONTACT_ICONS, contactIconClass } from "@/lib/preset-icons";
import ManualTranslateModal from "@/components/dashboard/ManualTranslateModal/ManualTranslateModal";
import useAdminPermissions, { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
const EMPTY_MANUAL = {
  title_en: "",
  description_en: "",
  button_text_en: ""
};
const EMPTY_FORM = {
  id: null,
  icon_key: "",
  title_tr: "",
  description_tr: "",
  button_text_tr: "",
  button_url: "",
  display_order: ""
};
export default function ContactManager() {
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
      const res = await adminFetch("/api/contact", {
        cache: "no-store"
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
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
    if (!term) return items;
    return items.filter(item => [item.title_tr, item.title_en, item.description_tr, item.button_url].filter(Boolean).some(v => String(v).toLowerCase().includes(term)));
  }, [items, search]);
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
    if (!form.icon_key) {
      setError(t("admin.contact.iconRequired"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    const editing = Boolean(form.id);
    const url = editing ? `/api/contact/${form.id}` : "/api/contact";
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          icon_key: form.icon_key,
          title_tr: form.title_tr,
          description_tr: form.description_tr,
          button_text_tr: form.button_text_tr,
          button_url: form.button_url,
          display_order: Number(form.display_order),
          manual_en: manualEnabled,
          title_en: manualEnabled ? manualValues.title_en : undefined,
          description_en: manualEnabled ? manualValues.description_en : undefined,
          button_text_en: manualEnabled ? manualValues.button_text_en : undefined
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
    if (!(await confirmAction(t("admin.contact.deleteConfirm")))) return;
    setError("");
    const res = await adminFetch(`/api/contact/${id}`, {
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
  function handleEdit(item) {
    setError("");
    setFormOpen(true);
    setSuccess("");
    setForm({
      id: item.id,
      icon_key: CONTACT_ICONS.includes(item.icon_key) ? item.icon_key : "",
      title_tr: item.title_tr || "",
      description_tr: item.description_tr || "",
      button_text_tr: item.button_text_tr || "",
      button_url: item.button_url || "",
      display_order: item.display_order === null || item.display_order === undefined ? "" : String(item.display_order)
    });
    setManualEnabled(false);
    setManualValues({
      title_en: item.title_en || "",
      description_en: item.description_en || "",
      button_text_en: item.button_text_en || ""
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
          <h1>{t("admin.contact.title")}</h1>
          <p>{t("admin.contact.subtitle")}</p>
        </div>
        <span className="admin-count">
          {items.length} {t("admin.state.total")}
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
            <label htmlFor="contact-icon">{t("admin.contact.icon")}</label>
            <div className="admin-icon-picker">
              <div className={`admin-preview${form.icon_key ? "" : " placeholder"}`} title={t("admin.contact.iconPreview")} aria-hidden="true">
                {form.icon_key ? <i className={contactIconClass(form.icon_key)}></i> : <i className="fa-solid fa-image"></i>}
              </div>
              <AdminSelect id="contact-icon" value={form.icon_key} onChange={value => setForm({
              ...form,
              icon_key: value
            })} required placeholder={t("admin.form.none")} options={CONTACT_ICONS.map(icon => ({
              value: icon,
              label: icon,
              iconClass: contactIconClass(icon)
            }))} />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="contact-order">{t("admin.form.order")}</label>
            <input id="contact-order" type="number" value={form.display_order} onChange={event => setForm({
            ...form,
            display_order: event.target.value
          })} placeholder="0" min={0} required />
          </div>

          <div className="admin-field">
            <label htmlFor="contact-title">{t("admin.contact.headline")}</label>
            <input id="contact-title" type="text" value={form.title_tr} onChange={event => setForm({
            ...form,
            title_tr: event.target.value
          })} required />
          </div>

          <div className="admin-field full">
            <label htmlFor="contact-desc">{t("admin.contact.description")}</label>
            <textarea id="contact-desc" rows={3} value={form.description_tr} onChange={event => setForm({
            ...form,
            description_tr: event.target.value
          })} required />
          </div>

          <div className="admin-field">
            <label htmlFor="contact-button-text">{t("admin.contact.buttonText")}</label>
            <input id="contact-button-text" type="text" value={form.button_text_tr} onChange={event => setForm({
            ...form,
            button_text_tr: event.target.value
          })} required />
          </div>

          <div className="admin-field">
            <label htmlFor="contact-button-url">{t("admin.contact.buttonUrl")}</label>
            <input id="contact-button-url" type="url" value={form.button_url} onChange={event => setForm({
            ...form,
            button_url: event.target.value
          })} placeholder="https://" required />
          </div>

          <ManualTranslateModal allowed={canManual} open={manualOpen} enabled={manualEnabled} values={manualValues} fields={[{
          key: "title_en",
          label: `${t("admin.contact.headline")} (EN)`
        }, {
          key: "description_en",
          label: `${t("admin.contact.description")} (EN)`,
          multiline: true
        }, {
          key: "button_text_en",
          label: `${t("admin.contact.buttonText")} (EN)`
        }]} onClose={() => setManualOpen(false)} onApply={(enabled, values) => {
          setManualEnabled(enabled);
          setManualValues(values);
          setError("");
          setSuccess(enabled ? t("admin.manual.applied") : t("admin.manual.cleared"));
        }} />

          <div className="admin-field-actions admin-form-footer">
            <div className="admin-save-actions">
              <button type="submit" className="admin-btn primary" disabled={saving}>{saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}</button>
              <button type="button" className="admin-btn ghost" onClick={closeForm}>{t("admin.form.cancel")}</button>
            </div>
            <div className="admin-translate-row">
              <button type="button" className={`admin-icon-btn${manualEnabled ? " is-active" : ""}`} onClick={() => setManualOpen(true)} title={t("admin.manual.open")} aria-label={t("admin.manual.open")}><i className="fa-solid fa-pen-to-square"></i></button>
              <button type="button" className="admin-btn ghost" disabled={translating || manualEnabled} title={manualEnabled ? t("admin.translate.autoOff") : ""} onClick={() => requestTranslate(["title_tr", "description_tr", "button_text_tr"])}><i className="fa-solid fa-language"></i>{" "}{translating ? t("admin.translate.loading") : t("admin.translate.btn")}</button>
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
            {items.length === 0 ? t("admin.contact.empty") : t("admin.state.noResults")}
          </div> : <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("admin.contact.icon")}</th>
                    <th>{t("admin.contact.headline")}</th>
                    <th>{t("admin.contact.buttonText")}</th>
                    <th>{t("admin.form.order")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(item => <tr key={item.id}>
                      <td data-label={t("admin.contact.icon")}>
                        <span className="admin-preview small">
                          <i className={contactIconClass(item.icon_key)}></i>
                        </span>
                      </td>
                      <td data-label={t("admin.contact.headline")}>{item.title_tr || "-"}</td>
                      <td data-label={t("admin.contact.buttonText")}>{item.button_text_tr || "-"}</td>
                      <td data-label={t("admin.form.order")}>
                        {item.display_order === null || item.display_order === undefined ? "-" : item.display_order}
                      </td>
                      <td className="admin-row-actions">
                        <div className="admin-row-actions-inner">
                          <button className="admin-btn ghost small" onClick={() => handleEdit(item)}>
                            <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                          </button>
                          <button className="admin-btn danger small" onClick={() => handleDelete(item.id)}>
                            <i className="fa-solid fa-trash"></i> {t("admin.form.delete")}
                          </button>
                        </div>
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
