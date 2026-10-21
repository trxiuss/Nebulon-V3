"use client";

import { useEffect, useMemo, useState } from "react";
import AdminFormModal from "@/components/dashboard/AdminFormModal/AdminFormModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import AdminPagination, { paginate } from "@/components/dashboard/AdminPagination/AdminPagination";
import ImageUrlField from "@/components/dashboard/ImageUrlField/ImageUrlField";
import { useAdminConfirm } from "@/components/dashboard/AdminConfirm/AdminConfirm";
import AdminSelect from "@/components/dashboard/AdminSelect/AdminSelect";
import { PRODUCT_IMAGE_PRESETS, PRODUCT_COUNT_ICON_TYPES, PRODUCT_ACTION_ICON_TYPES, PRODUCT_TECH_TAGS, PRESET_ICON_CLASSES } from "@/lib/preset-icons";
import ManualTranslateModal from "@/components/dashboard/ManualTranslateModal/ManualTranslateModal";
import TechnologySelectModal from "@/components/dashboard/TechnologySelectModal/TechnologySelectModal";
import useAdminPermissions, { adminFetch } from "@/components/dashboard/hooks/useAdminPermissions";
import "@/components/dashboard/ProductManager/ProductManager.css";
const EMPTY_MANUAL = {
  short_desc_en: ""
};
const IMAGE_PRESETS = PRODUCT_IMAGE_PRESETS;
const TECH_OPTIONS = PRODUCT_TECH_TAGS;
const EMPTY_FORM = {
  id: null,
  category_id: "",
  title_tr: "",
  short_desc_tr: "",
  is_active: true,
  image_type: "url",
  image_value: "",
  counter_api_url: "",
  count_icon_type: "download",
  pricing_type: "free",
  action_type: "download",
  action_icon_type: "download",
  action_url: "",
  tech_tags: []
};
export default function ProductManager() {
  const {
    t,
    localizeMessage
  } = useLanguage();
  const router = useRouter();
  const confirmAction = useAdminConfirm();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [techModalOpen, setTechModalOpen] = useState(false);
  useEffect(() => {
    if (canManual) return;
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
  }, [canManual]);
  async function load() {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([adminFetch("/api/products?admin=1", {
        cache: "no-store"
      }), adminFetch("/api/categories", {
        cache: "no-store"
      })]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
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
    return products.filter(product => {
      if (!term) return true;
      return [product.title_tr, product.title_en].filter(Boolean).some(v => v.toLowerCase().includes(term));
    });
  }, [products, search]);
  useEffect(() => {
    setPage(1);
  }, [search]);
  const pageItems = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  function categoryName(id) {
    const category = categories.find(c => Number(c.id) === Number(id));
    return category ? category.name_tr : null;
  }
  function toggleTechTag(tag) {
    setForm(prev => {
      const has = prev.tech_tags.includes(tag);
      return {
        ...prev,
        tech_tags: has ? prev.tech_tags.filter(t => t !== tag) : [...prev.tech_tags, tag]
      };
    });
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
      const updates = {};
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
        updates[field + "_en_preview"] = data.en;
      }
      if (!any) {
        setError(t("admin.translate.empty"));
        setTranslating(false);
        return;
      }
      setSuccess(t("admin.translate.success") + (updates.short_desc_tr_en_preview ? ` → ${updates.short_desc_tr_en_preview}` : ""));
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
    if (!form.action_url.trim()) {
      setError(t("admin.products.actionUrlRequired"));
      setSaving(false);
      return;
    }
    if (form.counter_api_url.trim()) {
      try {
        const counterUrl = new URL(form.counter_api_url.trim());
        if (!["http:", "https:"].includes(counterUrl.protocol) || form.counter_api_url.trim().length > 2048) {
          throw new Error("invalid counter URL");
        }
      } catch (validationError) {
        setError(t("admin.products.counterApiInvalid"));
        setSaving(false);
        return;
      }
    }
    const editing = Boolean(form.id);
    const url = editing ? `/api/products/${form.id}` : "/api/products";
    try {
      const res = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category_id: form.category_id || null,
          title_tr: form.title_tr,
          short_desc_tr: form.short_desc_tr,
          is_active: form.is_active,
          image_type: form.image_type,
          image_value: form.image_value,
          counter_api_url: form.counter_api_url.trim() || null,
          count_icon_type: form.count_icon_type,
          pricing_type: form.pricing_type,
          action_type: form.action_type,
          action_icon_type: form.action_icon_type,
          action_url: form.action_url,
          tech_tags: form.tech_tags,
          manual_en: manualEnabled,
          short_desc_en: manualEnabled ? manualValues.short_desc_en : undefined
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
    if (!(await confirmAction(t("admin.products.deleteConfirm")))) return;
    setError("");
    const res = await adminFetch(`/api/products/${id}`, {
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
    setTechModalOpen(false);
    setForm(EMPTY_FORM);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
  }
  function handleEdit(product) {
    setError("");
    setFormOpen(true);
    setSuccess("");
    setManualEnabled(false);
    setManualValues({
      short_desc_en: product.short_desc_en || ""
    });
    setForm({
      id: product.id,
      category_id: product.category_id ? String(product.category_id) : "",
      title_tr: product.title_tr,
      short_desc_tr: product.short_desc_tr || "",
      is_active: Number(product.is_active) === 1,
      image_type: product.image_type || "url",
      image_value: product.image_value || "",
      counter_api_url: product.counter_api_url || "",
      count_icon_type: product.count_icon_type || "download",
      pricing_type: product.pricing_type || "free",
      action_type: product.action_type || "download",
      action_icon_type: product.action_icon_type || "download",
      action_url: product.action_url || "",
      tech_tags: Array.isArray(product.tech_tags) ? product.tech_tags : []
    });
  }
  function closeForm() {
    if (saving || translating) return;
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
    setTechModalOpen(false);
    setError("");
    setSuccess("");
  }
  function handleAdd() {
    setForm(EMPTY_FORM);
    setManualOpen(false);
    setManualEnabled(false);
    setManualValues(EMPTY_MANUAL);
    setTechModalOpen(false);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }
  return <>
      <div className="admin-header">
        <div>
          <h1>{t("admin.products.title")}</h1>
          <p>{t("admin.products.subtitle")}</p>
        </div>
        <span className="admin-count">
          {products.length} {t("admin.state.total")}
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
            <label htmlFor="product-title">{t("admin.products.name")}</label>
            <input id="product-title" type="text" value={form.title_tr} onChange={event => setForm({
            ...form,
            title_tr: event.target.value
          })} required />
          </div>

          <div className="admin-field">
            <label htmlFor="product-category">{t("admin.products.category")}</label>
            <AdminSelect id="product-category" value={form.category_id} onChange={value => setForm({
            ...form,
            category_id: value
          })} placeholder={t("admin.products.noCategory")} options={[{
            value: "",
            label: t("admin.products.noCategory")
          }, ...categories.map(category => ({
            value: String(category.id),
            label: category.name_tr
          }))]} />
          </div>

          <div className="admin-field full">
            <label htmlFor="product-desc">{t("admin.products.desc")}</label>
            <textarea id="product-desc" rows={2} value={form.short_desc_tr} onChange={event => setForm({
            ...form,
            short_desc_tr: event.target.value
          })} />
          </div>

          <ManualTranslateModal allowed={canManual} open={manualOpen} enabled={manualEnabled} values={manualValues} fields={[{
          key: "short_desc_en",
          label: `${t("admin.products.desc")} (EN)`,
          multiline: true
        }]} onClose={() => setManualOpen(false)} onApply={(enabled, values) => {
          setManualEnabled(enabled);
          setManualValues(values);
          setError("");
          setSuccess(enabled ? t("admin.manual.applied") : t("admin.manual.cleared"));
        }} />

          <div className="admin-field">
            <label htmlFor="product-active">{t("admin.products.isActive")}</label>
            <AdminSelect id="product-active" value={form.is_active ? "1" : "0"} onChange={value => setForm({
            ...form,
            is_active: value === "1"
          })} options={[{
            value: "1",
            label: t("admin.products.statusActive"),
            iconClass: "fa-solid fa-circle-check"
          }, {
            value: "0",
            label: t("admin.products.statusHidden"),
            iconClass: "fa-solid fa-eye-slash"
          }]} />
          </div>

          <div className="admin-field full">
            <label>{t("admin.products.imageType")}</label>
            <div className="admin-tabs" role="tablist">
              <button type="button" className={`admin-tab${form.image_type === "url" ? " active" : ""}`} onClick={() => setForm({
              ...form,
              image_type: "url",
              image_value: ""
            })}>
                {t("admin.products.imageTypeUrl")}
              </button>
              <button type="button" className={`admin-tab${form.image_type === "preset" ? " active" : ""}`} onClick={() => setForm({
              ...form,
              image_type: "preset",
              image_value: ""
            })}>
                {t("admin.products.imageTypePreset")}
              </button>
            </div>
            {form.image_type === "preset" ? <>
                <div className="admin-icon-picker">
                  <div className={`admin-preview${PRESET_ICON_CLASSES[form.image_value] ? "" : " placeholder"}`}>
                    <i className={PRESET_ICON_CLASSES[form.image_value] || "fa-solid fa-image"}></i>
                  </div>
                  <AdminSelect id="product-image-preset" value={form.image_value} onChange={value => setForm({
                ...form,
                image_value: value
              })} placeholder={t("admin.form.none")} options={[...IMAGE_PRESETS.map(preset => ({
                value: preset,
                label: preset,
                iconClass: PRESET_ICON_CLASSES[preset] || "fa-solid fa-image"
              }))]} />
                </div>
              </> : <>
                <ImageUrlField value={form.image_value} onChange={value => setForm({
              ...form,
              image_value: value
            })} />
              </>}
          </div>

          <div className="admin-field">
            <label htmlFor="product-counter-api">{t("admin.products.counterApiUrl")}</label>
            <input id="product-counter-api" type="url" maxLength={2048} value={form.counter_api_url} onChange={event => setForm({
            ...form,
            counter_api_url: event.target.value
          })} placeholder="https://api.example.com/project/..." />
          </div>

          <div className="admin-field">
            <label htmlFor="product-count-icon">{t("admin.products.countIconType")}</label>
            <AdminSelect id="product-count-icon" value={form.count_icon_type} onChange={value => setForm({
            ...form,
            count_icon_type: value
          })} options={PRODUCT_COUNT_ICON_TYPES.map(icon => ({
            value: icon,
            label: icon,
            iconClass: icon === "eye" ? "fa-solid fa-eye" : "fa-solid fa-download"
          }))} />
          </div>

          <div className="admin-field">
            <label htmlFor="product-pricing">{t("admin.products.pricingType")}</label>
            <AdminSelect id="product-pricing" value={form.pricing_type} onChange={value => setForm({
            ...form,
            pricing_type: value
          })} options={[{
            value: "free",
            label: t("admin.products.pricingFree"),
            iconClass: "fa-solid fa-gift"
          }, {
            value: "paid",
            label: t("admin.products.pricingPaid"),
            iconClass: "fa-solid fa-tag"
          }]} />
          </div>

          <div className="admin-field">
            <label htmlFor="product-action-type">{t("admin.products.actionType")}</label>
            <AdminSelect id="product-action-type" value={form.action_type} onChange={actionType => {
            setForm({
              ...form,
              action_type: actionType,
              action_icon_type: actionType === "view" ? "eye" : actionType
            });
          }} options={[{
            value: "download",
            label: t("admin.products.actionDownload"),
            iconClass: "fa-solid fa-download"
          }, {
            value: "view",
            label: t("admin.products.actionView"),
            iconClass: "fa-solid fa-eye"
          }, {
            value: "purchase",
            label: t("admin.products.actionPurchase"),
            iconClass: "fa-solid fa-cart-shopping"
          }, {
            value: "github",
            label: t("admin.products.actionGithub"),
            iconClass: "fa-brands fa-github"
          }]} />
          </div>

          <div className="admin-field">
            <label htmlFor="product-action-icon">{t("admin.products.actionIconType")}</label>
            <AdminSelect id="product-action-icon" value={form.action_icon_type} onChange={value => setForm({
            ...form,
            action_icon_type: value
          })} options={PRODUCT_ACTION_ICON_TYPES.map(icon => ({
            value: icon,
            label: icon,
            iconClass: icon === "eye" ? "fa-solid fa-eye" : icon === "purchase" ? "fa-solid fa-cart-shopping" : icon === "github" ? "fa-brands fa-github" : "fa-solid fa-download"
          }))} />
          </div>

          <div className="admin-field">
            <label htmlFor="product-action-url">{t("admin.products.actionUrl")}</label>
            <input id="product-action-url" type="url" value={form.action_url} onChange={event => setForm({
            ...form,
            action_url: event.target.value
          })} placeholder="https://..." required />
          </div>

          <div className="admin-field full">
            <label>{t("admin.products.techTags")}</label>
            <button type="button" className="admin-btn ghost admin-tech-open" onClick={() => setTechModalOpen(true)}>
              <i className="fa-solid fa-code" />
              {form.tech_tags.length ? t("admin.products.techSelected").replace("{count}", form.tech_tags.length) : t("admin.products.techSelect")}
            </button>
          </div>

          <TechnologySelectModal open={techModalOpen} options={TECH_OPTIONS} selected={form.tech_tags} onToggle={toggleTechTag} onClose={() => setTechModalOpen(false)} />

          <div className="admin-field-actions admin-form-footer">
            <div className="admin-save-actions">
              <button type="submit" className="admin-btn primary" disabled={saving}>
                {saving ? t("admin.form.saving") : form.id ? t("admin.form.update") : t("admin.form.add")}
              </button>
              <button type="button" className="admin-btn ghost" onClick={closeForm}>{t("admin.form.cancel")}</button>
            </div>
            <div className="admin-translate-row">
              <button type="button" className={`admin-icon-btn${manualEnabled ? " is-active" : ""}`} onClick={() => setManualOpen(true)} title={t("admin.manual.open")} aria-label={t("admin.manual.open")}><i className="fa-solid fa-pen-to-square"></i></button>
              <button type="button" className="admin-btn ghost" disabled={translating || manualEnabled} title={manualEnabled ? t("admin.translate.autoOff") : ""} onClick={() => requestTranslate(["short_desc_tr"])}><i className="fa-solid fa-language"></i>{" "}{translating ? t("admin.translate.loading") : t("admin.translate.btn")}</button>
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
            {products.length === 0 ? t("admin.products.empty") : t("admin.state.noResults")}
          </div> : <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.products.name")}</th>
                  <th>{t("admin.products.category")}</th>
                  <th>{t("admin.products.isActive")}</th>
                  <th>{t("admin.products.pricingType")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(product => <tr key={product.id}>
                    <td data-label={t("admin.products.name")}>{product.title_tr}</td>
                    <td data-label={t("admin.products.category")}>
                      {categoryName(product.category_id) || <span className="admin-tag danger">{t("admin.products.uncategorized")}</span>}
                    </td>
                    <td data-label={t("admin.products.isActive")}>
                      {Number(product.is_active) === 1 ? "✓" : "-"}
                    </td>
                    <td data-label={t("admin.products.pricingType")}>
                      <span className={`admin-tag ${product.pricing_type === "paid" ? "warn" : "ok"}`}>
                        {product.pricing_type === "paid" ? t("admin.products.pricingPaid") : t("admin.products.pricingFree")}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      <button className="admin-btn ghost small" onClick={() => handleEdit(product)}>
                        <i className="fa-solid fa-pen"></i> {t("admin.form.edit")}
                      </button>
                      <button className="admin-btn danger small" onClick={() => handleDelete(product.id)}>
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
