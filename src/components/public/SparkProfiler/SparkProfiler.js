"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import "@/components/public/SparkProfiler/SparkProfiler.css";

const ROWS = [
  { depth: 0, label: "Server thread", pct: 100 },
  { depth: 1, label: "MinecraftServer.tickServer()", pct: 97.6 },
  { depth: 2, label: "ServerLevel.tick()", pct: 64.2 },
  { depth: 3, label: "ChunkMap.tick()", pct: 21.8 },
  { depth: 3, label: "EntityTickList.forEach()", pct: 18.3 },
  { depth: 2, label: "PluginManager.callEvent()", pct: 9.4 },
  { depth: 3, label: "NebulonCore", pct: 0.31, own: true },
  { depth: 3, label: "NebulonMenu", pct: 0.24, own: true },
  { depth: 3, label: "NebulonChat", pct: 0.19, own: true },
  { depth: 2, label: "NetworkIO.flush()", pct: 12.7 }
];

const OWN_TOTAL = ROWS.filter((r) => r.own).reduce((sum, r) => sum + r.pct, 0);

export default function SparkProfiler() {
  const { t, locale } = useLanguage();
  const ref = useRef(null);
  const [live, setLive] = useState(false);
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setLive(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`spark${live ? " is-live" : ""}`} role="img" aria-label={t("perf.mockTitle")}>
      <div className="spark-bar">
        <span className="spark-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span className="spark-name">{t("perf.mockTitle")}</span>
        <span className="spark-live" aria-hidden="true"></span>
      </div>
      <div className="spark-meta">{t("perf.mockMeta")}</div>
      <ul className="spark-tree">
        {ROWS.map((row, i) => (
          <li
            key={row.label}
            className={`spark-row${row.own ? " is-own" : ""}`}
            style={{ "--d": row.depth, "--i": i, "--w": `${Math.max(row.pct, 1.4)}%` }}
          >
            <span className="spark-fill" aria-hidden="true"></span>
            <span className="spark-label">{row.label}</span>
            <span className="spark-pct">{fmt.format(row.pct)}%</span>
          </li>
        ))}
      </ul>
      <div className="spark-total">
        <span>{t("perf.mockTotal")}</span>
        <strong>{fmt.format(OWN_TOTAL)}%</strong>
      </div>
    </div>
  );
}
