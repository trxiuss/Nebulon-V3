"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/components/public/BackgroundChrome/BackgroundChrome.css";
import { createBgSwitcher, pickBg } from "@/components/public/BackgroundChrome/bgSwitcher";
import { startStarCanvas } from "@/components/public/BackgroundChrome/starCanvas";

const POOL = ["bg-01", "bg-02", "bg-03", "bg-04", "bg-06"];

function BgStack({ initialKey }) {
  const pathname = usePathname();
  const stackRef = useRef(null);
  const [first] = useState(initialKey);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return undefined;
    const root = document.documentElement;
    const switcher = createBgSwitcher(stack);
    let raf = 0;

    const apply = () => switcher.show(pickBg(pathname, root.classList.contains("is-not-found")));
    raf = requestAnimationFrame(apply);

    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    function onIntent(e) {
      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      let url;
      try {
        url = new URL(a.href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      switcher.stage(pickBg(url.pathname, false));
    }

    const opts = { passive: true, capture: true };
    document.addEventListener("pointerdown", onIntent, opts);
    document.addEventListener("touchstart", onIntent, opts);
    document.addEventListener("mouseover", onIntent, opts);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("pointerdown", onIntent, opts);
      document.removeEventListener("touchstart", onIntent, opts);
      document.removeEventListener("mouseover", onIntent, opts);
      switcher.destroy();
    };
  }, [pathname]);

  return (
    <div className="bg-stack" ref={stackRef}>
      <div className="bg-img is-front" data-bg={first}></div>
      <div className="bg-img" hidden></div>
    </div>
  );
}

export default function BackgroundChrome() {
  const pathname = usePathname();
  const isAdminArea = pathname === "/login" || pathname.startsWith("/dashboard");
  const isHome = pathname === "/";
  const wrapRef = useRef(null);
  const starRef = useRef(null);

  useEffect(() => {
    if (isAdminArea) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const base = isHome ? "bg-04" : "bg-01";
    const vh = window.innerHeight || 1;
    const scrollable = (document.documentElement.scrollHeight - vh) / vh;
    let extra = 0;
    if (scrollable >= 1.4) extra = 1;
    if (scrollable >= 2.6) extra = 2;
    if (scrollable >= 4) extra = 3;
    if (isHome) extra = 2;
    if (extra === 0) return;

    const pool = POOL.filter((name) => name !== base);
    const layers = pool.slice(0, extra).map((name) => {
      const el = document.createElement("div");
      el.className = "bg-photo-layer";
      el.style.backgroundImage = `url("/assets/backgrounds/${name}.webp")`;
      wrap.appendChild(el);
      return el;
    });

    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    function recomputeMax() {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    let ticking = false;
    function update() {
      ticking = false;
      const p = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const steps = layers.length + 1;
      layers.forEach((el, i) => {
        const start = (i + 1) / steps - 0.22;
        const end = (i + 1) / steps + 0.22;
        const v = (p - start) / (end - start);
        el.style.opacity = String(Math.min(1, Math.max(0, v)));
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recomputeMax);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recomputeMax);
      layers.forEach((el) => el.remove());
    };
  }, [isHome, isAdminArea]);

  useEffect(() => {
    if (isAdminArea) return;
    const root = document.documentElement;
    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let ticking = false;

    function recomputeMax() {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    function update() {
      const y = window.scrollY || 0;
      const progress = Math.min(1, Math.max(0, y / maxScroll));
      const fade = 1 - progress * 0.45;
      root.style.setProperty("--star-depth-fade", fade.toFixed(3));
      ticking = false;
    }

    update();
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recomputeMax);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recomputeMax);
    };
  }, [isAdminArea]);

  useEffect(() => {
    if (isAdminArea) return;
    const nebulae = document.querySelectorAll(".nebula");
    let lastY = 0;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      const isNarrow = window.innerWidth < 768;
      nebulae.forEach((n, i) => {
        const speed = isNarrow ? (i + 1) * 0.012 : (i + 1) * 0.035;
        n.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
      lastY = y;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isAdminArea]);

  useEffect(() => {
    if (isAdminArea || !isHome) return undefined;
    return startStarCanvas(starRef.current);
  }, [isHome, isAdminArea]);

  if (isAdminArea) return null;

  return (
    <>
      <div className="bg-animation" ref={wrapRef}>
        <BgStack initialKey={pickBg(pathname, false)} />
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
      </div>
      {isHome && (
        <div className="starfield" ref={starRef}>
          <div className="star-layer star-small"></div>
          <div className="star-layer star-mid"></div>
          <div className="star-layer star-big"></div>
        </div>
      )}
    </>
  );
}
