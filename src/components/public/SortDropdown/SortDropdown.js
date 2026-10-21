"use client";

import { useEffect, useRef, useState } from "react";
import "@/components/public/SortDropdown/SortDropdown.css";

export default function SortDropdown({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`sort-dropdown${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="sort-dropdown-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <i className="fa-solid fa-arrow-down-wide-short"></i>
        <span>{active ? active.label : label}</span>
        <i className="fa-solid fa-chevron-down sort-dropdown-caret"></i>
      </button>
      <ul className="sort-dropdown-menu" role="listbox" aria-hidden={!open}>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                className={`sort-dropdown-item${opt.value === value ? " active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <i className="fa-solid fa-check"></i>}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
