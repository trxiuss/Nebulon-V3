"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { slugify } from "@/lib/utils";
import { CATEGORY_ICONS, PRESET_ICON_CLASSES } from "@/lib/preset-icons";
import ManualTranslateModal from "@/components/dashboard/ManualTranslateModal/ManualTranslateModal";
import useAdminPermissions, { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
const EMPTY_MANUAL = {
  name_en: "",
  description_en: ""
};
const EMPTY_FORM = {
  id: null,
  name_tr: "",
  slug: "",
  description_tr: "",
  icon_key: "",
  display_order: ""
};
const ICON_OPTIONS = CATEGORY_ICONS;
export default function CategoryManager() {
  const {
    t,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
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
      const [catRes, prodRes] = await Promise.all([adminFetch("/api/categories", {
        cache: "no-store"
      }), adminFetch("/api/products?admin=1", {
        cache: "no-store"
      })]);
      const catData = await catRes.json();
      const prodData = await prodRes.json().catch(() => []);
      setCategories(Array.isArray(catData) ? catData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
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
    if (!term) return categories;
    return categories.filter(category => [category.name_tr, category.name_en, category.slug].filter(Boolean).some(value => value.toLowerCase().includes(term)));
  }, [categories, search]);
  useEffect(() => {
    setPage(1);
  }, [search]);
  const pageItems = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  function productCountFor(category) {
    if (typeof category.active_product_count === "number") {
      return category.active_product_count;
    }
    return products.filter(p => Number(p.category_id) === Number(category.id) && Number(p.is_active) === 1).length;
  }
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
    const url = editing ? `/api/categories/${form.id}` : "/api/categories";
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name_tr: form.name_tr,
          slug: form.slug || slugify(form.name_tr),
          description_tr: form.description_tr,
          icon_key: form.icon_key || null,
          display_order: Number(form.display_order),
          manual_en: manualEnabled,
          name_en: manualEnabled ? manualValues.name_en : undefined,
          description_en: manualEnabled ? manualValues.description_en : undefined
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
    if (!(await confirmAction(t("admin.categories.deleteConfirm")))) return;
    setError("");
    const res = await adminFetch(`/api/categories/${id}`, {
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
  function handleEdit(category) {
    setError("");
    setFormOpen(true);
    setSuccess("");
    setForm({
      id: category.id,
      name_tr: category.name_tr,
      slug: category.slug,
      description_tr: category.description_tr || "",
      icon_key: category.icon_key || "",
      display_order: category.display_order === null || category.display_order === undefined ? "" : String(category.display_order)
    });
    setManualEnabled(false);
    setManualValues({
      name_en: category.name_en || "",
      description_en: category.description_en || ""
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
          <h1>{t("admin.categories.title")}</h1>
          <p>{t("admin.categories.subtitle")}</p>
        </div>
        <span className="admin-count">
          {categories.length} {t("admin.state.total")}
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
            <label htmlFor="category-name">{t("admin.categories.name")}</label>
            <input id="category-name" type="text" value={form.name_tr} onChange={event => {
            const value = event.target.value;
            setForm(prev => ({
              ...prev,
              name_tr: value,
              slug: prev.id ? prev.slug : slugify(value)
            }));
          }} required />
          </div>

          <div className="admin-field">
            <label htmlFor="category-slug">{t("admin.categories.slug")}</label>
            <input id="category-slug" type="text" value={form.slug} onChange={event => setForm({
            ...form,
            slug: slugify(event.target.value)
          })} placeholder="plugins" required />
          </div>

          <div className="admin-field">
            <label htmlFor="category-icon">{t("admin.categories.icon")}</label>
            <div className="admin-icon-picker">
              <div className={`admin-preview${PRESET_ICON_CLASSES[form.icon_key] ? "" : " placeholder"}`} aria-hidden="true">
                <i className={PRESET_ICON_CLASSES[form.icon_key] || "fa-solid fa-image"}></i>
              </div>
              <AdminSelect id="category-icon" value={form.icon_key} onChange={value => setForm({
              ...form,
              icon_key: value
            })} placeholder={t("admin.form.none")} options={[...ICON_OPTIONS.map(icon => ({
              value: icon,
              label: icon,
              iconClass: PRESET_ICON_CLASSES[icon] || "fa-solid fa-image"
            }))]} />
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="category-order">{t("admin.form.order")}</label>
            <input id="category-order" type="number" value={form.display_order} onChange={event => setForm({
            ...form,
            display_order: event.target.value
          })} placeholder="0" min={0} required />
          </div>

          <div className="admin-field full">
            <label htmlFor="category-description">{t("admin.categories.description")}</label>
            <textarea id="category-description" rows={2} value={form.description_tr} onChange={event => setForm({
            ...form,
            description_tr: event.target.value
          })} />
          </div>

          <ManualTranslateModal allowed={canManual} open={manualOpen} enabled={manualEnabled} values={manualValues} fields={[{
          key: "name_en",
          label: `${t("admin.categories.name")} (EN)`
        }, {
          key: "description_en",
          label: `${t("admin.categories.description")} (EN)`,
          multiline: true
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
              <button type="button" className="admin-btn ghost" disabled={translating || manualEnabled} title={manualEnabled ? t("admin.translate.autoOff") : ""} onClick={() => requestTranslate(["name_tr", "description_tr"])}><i className="fa-solid fa-language"></i>{" "}{translating ? t("admin.translate.loading") : t("admin.translate.btn")}</button>
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
            {categories.length === 0 ? t("admin.categories.empty") : t("admin.state.noResults")}
          </div> : <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.categories.name")}</th>
                  <th>{t("admin.categories.slug")}</th>
                  <th>{t("admin.form.order")}</th>
                  <th>{t("admin.products.title")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(category => <tr key={category.id}>
                    <td data-label={t("admin.categories.name")}>{category.name_tr}</td>
                    <td data-label={t("admin.categories.slug")}>{category.slug}</td>
                    <td data-label={t("admin.form.order")}>
                      {category.display_order === null || category.display_order === undefined ? "-" : category.display_order}
                    </td>
                    <td data-label={t("admin.products.title")}>{productCountFor(category)}</td>
                    <td className="admin-row-actions">
                      <button className="admin-btn ghost small" onClick={() => handleEdit(category)}>
                        <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                      </button>
                      <button className="admin-btn danger small" onClick={() => handleDelete(category.id)}>
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
