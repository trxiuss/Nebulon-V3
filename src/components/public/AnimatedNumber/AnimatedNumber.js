"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value, duration = 3000, formatLocale = "tr-TR" }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return undefined;
    startedRef.current = true;

    const t0 = performance.now();
    let raf;
    let last = -1;

    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      const next = Math.round(target * eased);
      if (next !== last) {
        last = next;
        setDisplay(next);
      }
      if (p < 1) raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  const formatter = new Intl.NumberFormat(formatLocale);

  return (
    <span style={{ display: "inline-grid", fontVariantNumeric: "tabular-nums", justifyItems: "center" }}>
      <span aria-hidden="true" style={{ gridArea: "1 / 1", visibility: "hidden" }}>{formatter.format(target)}</span>
      <span style={{ gridArea: "1 / 1" }}>{formatter.format(display)}</span>
    </span>
  );
}
