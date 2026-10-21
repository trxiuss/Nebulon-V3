"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "@/components/public/ScrollTopButton/ScrollTopButton.css";

function smoothScrollToTop() {
  const root = document.documentElement;
  const startY = window.scrollY || 0;
  if (startY <= 0) return;

  const reduce = false;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  if (reduce) {
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
    return;
  }

  const duration = Math.min(1700, Math.max(950, startY * 0.55));
  const startTime = performance.now();
  let raf = 0;

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const stop = () => {
    cancelAnimationFrame(raf);
    root.style.scrollBehavior = prev;
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, Math.round(startY * (1 - ease(t))));
    if (t < 1) raf = requestAnimationFrame(step);
    else stop();
  };

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  raf = requestAnimationFrame(step);
}

export default function ScrollTopButton() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/login" || pathname.startsWith("/dashboard")) return null;

  return (
    <button
      className={`scroll-top-btn${show ? " show" : ""}`}
      aria-label="Yukar\u0131 \u00e7\u0131k"
      onClick={(e) => {
        smoothScrollToTop();
        e.currentTarget.blur();
      }}
    >
      <i className="fa-solid fa-arrow-up"></i>
    </button>
  );
}
