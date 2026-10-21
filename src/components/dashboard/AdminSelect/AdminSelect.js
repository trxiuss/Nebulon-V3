"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/components/dashboard/AdminSelect/AdminSelect.css";

export default function AdminSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "",
  disabled = false,
  required = false,
  className = "",
  name
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const autoId = useId();
  const selectId = id || `admin-select-${autoId}`;
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const measure = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = window.innerHeight || 0;
    const spaceBelow = viewport - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const goUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setOpenUp(goUp);
    const maxHeight = Math.max(140, Math.min(280, goUp ? spaceAbove : spaceBelow));
    setMenuStyle({
      position: "fixed",
      left: `${Math.round(rect.left)}px`,
      width: `${Math.round(rect.width)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
      ...(goUp
        ? { bottom: `${Math.round(viewport - rect.top + 8)}px`, top: "auto" }
        : { top: `${Math.round(rect.bottom + 8)}px`, bottom: "auto" })
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, measure]);

  const selectable = useMemo(() => options.filter((option) => !option.disabled), [options]);
  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value ?? "")),
    [options, value]
  );

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      const inRoot = rootRef.current && rootRef.current.contains(event.target);
      const inMenu = listRef.current && listRef.current.contains(event.target);
      if (!inRoot && !inMenu) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = selectable.findIndex((option) => String(option.value) === String(value ?? ""));
    setActiveIndex(index >= 0 ? index : 0);
  }, [open, selectable, value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector('[data-active="true"]');
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  function commit(option) {
    if (!option || option.disabled) return;
    setOpen(false);
    if (String(option.value) !== String(value ?? "")) onChange?.(option.value);
  }

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return selectable.length - 1;
        if (next >= selectable.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) setOpen(true);
      else commit(selectable[activeIndex]);
      return;
    }
    if (event.key === "Tab") setOpen(false);
  }

  function renderIcon(option) {
    if (!option) return null;
    if (option.icon) return <span className={`admin-select-icon${option.iconToneClass ? ` ${option.iconToneClass}` : ""}`}>{option.icon}</span>;
    if (option.iconClass)
      return (
        <span className={`admin-select-icon${option.iconToneClass ? ` ${option.iconToneClass}` : ""}`}>
          <i className={option.iconClass} aria-hidden="true" />
        </span>
      );
    return null;
  }

  return (
    <div
      className={`admin-select${open ? " open" : ""}${disabled ? " disabled" : ""}${className ? ` ${className}` : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={selectId}
        className="admin-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={`admin-select-value${selected ? "" : " placeholder"}`}>
          {renderIcon(selected)}
          <span className="admin-select-text">{selected ? selected.label : placeholder}</span>
        </span>
        <i className="fa-solid fa-chevron-down admin-select-caret" aria-hidden="true" />
      </button>

      {name ? <input type="hidden" name={name} value={value ?? ""} readOnly /> : null}

      {mounted
        ? createPortal(
            <div
              className={`admin-select-menu is-portal${openUp ? " is-up" : ""}${open ? " open" : ""}`}
              role="listbox"
              aria-labelledby={selectId}
              ref={listRef}
              style={menuStyle || undefined}
            >
        {options.map((option) => {
          const isSelected = String(option.value) === String(value ?? "");
          const activeOption = selectable[activeIndex];
          const isActive = activeOption && String(activeOption.value) === String(option.value);
          return (
            <button
              key={`${option.value}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-active={isActive ? "true" : "false"}
              disabled={option.disabled}
              className={`admin-select-option${isSelected ? " selected" : ""}${isActive ? " active" : ""}`}
              onClick={() => commit(option)}
              onMouseEnter={() => {
                const index = selectable.findIndex(
                  (item) => String(item.value) === String(option.value)
                );
                if (index >= 0) setActiveIndex(index);
              }}
            >
              {renderIcon(option)}
              <span className="admin-select-text">{option.label}</span>
              {isSelected ? <i className="fa-solid fa-check admin-select-check" aria-hidden="true" /> : null}
            </button>
          );
        })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
