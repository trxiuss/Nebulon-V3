"use client";

import { useEffect, useState } from "react";
import "@/components/dashboard/ImageUrlField/ImageUrlField.css";

export default function ImageUrlField({ label, value, onChange, round = false }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [value]);

  return (
    <div className="admin-field full">
      {label ? <label>{label}</label> : null}
      <div className="admin-image-row">
        {value && !broken ? (
          <img
            src={value}
            alt=""
            className={`admin-preview${round ? " round" : ""}`}
            onError={() => setBroken(true)}
          />
        ) : (
          <span className={`admin-preview placeholder${round ? " round" : ""}`}>
            <i className="fa-solid fa-image"></i>
          </span>
        )}
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {value ? (
          <button type="button" className="admin-btn ghost small" onClick={() => onChange("")}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        ) : null}
      </div>
    </div>
  );
}
