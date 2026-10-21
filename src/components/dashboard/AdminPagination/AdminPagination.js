"use client";

import { useLanguage } from "@/context/LanguageContext";
import "@/components/dashboard/AdminPagination/AdminPagination.css";

function buildPageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of list) {
    if (prev && p - prev > 1) out.push("...");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function AdminPagination({ page, pageSize, total, onPageChange }) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">
        {from}-{to} / {total}
      </span>
      <div className="admin-pagination-actions">
        <button
          type="button"
          className="admin-btn ghost small"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t("admin.form.search") ? "prev" : "prev"}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        {pages.map((p, index) =>
          p === "..." ? (
            <span key={`gap-${index}`} className="admin-pagination-gap">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`admin-btn small admin-pagination-num${p === page ? " primary" : " ghost"}`}
              onClick={() => onPageChange(p)}
              disabled={p === page}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="admin-btn ghost small"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="next"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
