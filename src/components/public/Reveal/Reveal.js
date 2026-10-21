"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scrollState } from "@/lib/scrollState";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState("ssr");
  const [dir, setDir] = useState("from-bottom");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.96 && rect.bottom > 0;
    const firstPaint = !document.documentElement.classList.contains("page-ready");

    if (inView) {
      setPhase(firstPaint ? "static" : "enter");
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      setPhase("static");
      return undefined;
    }

    setPhase("hidden");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setDir(scrollState.down ? "from-bottom" : "from-top");
          setPhase("enter");
          io.disconnect();
          break;
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const delayClass = delay ? ` reveal-delay-${delay}` : "";
  const phaseClass = phase === "hidden" ? " is-hidden" : phase === "enter" ? " is-entering" : "";

  return (
    <Tag ref={ref} className={`reveal${delayClass} ${dir}${phaseClass} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
