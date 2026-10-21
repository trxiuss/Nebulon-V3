"use client";

import { useEffect } from "react";
import { scrollState } from "@/lib/scrollState";
import "@/components/public/InteractionController/InteractionController.css";

const INTERACTIVE_SELECTOR =
  ".feature-card, .cat-card, .plugin-card, .team-card, .ref-card, .contact-card, " +
  ".btn, .btn-sm, .btn-discord, .btn-primary, .cat-body a, .socials a, " +
  ".scroll-top-btn, .mobile-menu-btn, .lang-btn, .desktop-menu a, .mobile-nav-links a, " +
  ".footer-top a";

export default function InteractionController() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("page-ready");

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!window.location.hash) {
      const prevBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        root.style.scrollBehavior = prevBehavior;
      });
    }

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.classList.add("hover-ready");
    }

    function onPointerMove(e) {
      if (e.pointerType === "mouse") root.classList.add("hover-ready");
    }
    document.addEventListener("pointermove", onPointerMove, { passive: true });

    scrollState.lastY = window.scrollY || 0;
    function onScroll() {
      const y = window.scrollY || 0;
      if (Math.abs(y - scrollState.lastY) > 2) {
        scrollState.down = y > scrollState.lastY;
        scrollState.lastY = y;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    const raf1 = requestAnimationFrame(() => {
      root.classList.add("js-ready");
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchTarget = null;

    const isFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const clearTouchEffects = () => {
      document.querySelectorAll(".touch-active, .press-parent, .is-selected").forEach((el) => {
        el.classList.remove(
          "touch-active",
          "press-parent",
          "is-selected",
          "social-link",
          "desktop-menu-link",
          "mobile-nav-link",
          "logo-touch"
        );
      });
    };

    const markTouchActive = (el) => {
      if (!el) return;
      clearTouchEffects();
      const card = el.closest(".feature-card, .cat-card, .plugin-card, .team-card, .ref-card, .contact-card");
      const target = card || el;
      target.classList.add("touch-active");
      if (el.matches(".socials a")) el.classList.add("touch-active", "social-link");
      if (el.matches(".desktop-menu a")) el.classList.add("desktop-menu-link");
      if (el.matches(".mobile-nav-links a")) el.classList.add("mobile-nav-link");
      if (el.matches(".logo a")) el.classList.add("logo-touch");
      if (el.matches(".cat-body a, .btn-sm, .btn-discord") && card) {
        el.classList.add("touch-active");
        card.classList.add("press-parent");
      }
    };

    function onTouchStart(event) {
      if (!event.touches || !event.touches.length || isFinePointer()) return;
      const t = event.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchTarget = event.target.closest(INTERACTIVE_SELECTOR);
      if (!touchTarget || touchTarget.closest(".faq-item")) return;
      markTouchActive(touchTarget);
    }

    function onTouchMove(event) {
      if (!event.touches || !event.touches.length) return;
      const t = event.touches[0];
      if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 12) {
        touchTarget = null;
        clearTouchEffects();
      }
    }

    function onTouchEnd() {
      clearTouchEffects();
      touchTarget = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(raf1);
    };
  }, []);

  return null;
}
