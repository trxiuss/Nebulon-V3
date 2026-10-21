"use client";

import { useCallback } from "react";
import Reveal from "@/components/public/Reveal/Reveal";

function aim(el, e) {
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  el.style.setProperty("--mx", `${x}px`);
  el.style.setProperty("--my", `${y}px`);
  el.style.setProperty("--px", (Math.max(0, Math.min(1, x / rect.width)) * 2 - 1).toFixed(3));
  el.style.setProperty("--py", (Math.max(0, Math.min(1, y / rect.height)) * 2 - 1).toFixed(3));
}

export default function Spotlight({ as = "div", className = "", children, ...rest }) {

  const onPointerMove = useCallback((e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    aim(e.currentTarget, e);
  }, []);

  const onPointerLeave = useCallback((e) => {
    const el = e.currentTarget;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse") return;
    const el = e.currentTarget;
    aim(el, e);
    el.setAttribute("data-hot", "1");
  }, []);

  const onPointerUp = useCallback((e) => {
    if (e.pointerType !== "mouse") e.currentTarget.removeAttribute("data-hot");
  }, []);

  return (
    <Reveal
      as={as}
      className={`spot ${className}`.trim()}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      {...rest}
    >
      {children}
    </Reveal>
  );
}
