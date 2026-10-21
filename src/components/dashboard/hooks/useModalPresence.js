"use client";

import { useEffect, useState } from "react";

export const MODAL_OUT_MS = 360;

export default function useModalPresence(open, outMs = MODAL_OUT_MS) {
  const [mounted, setMounted] = useState(Boolean(open));

  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    const id = setTimeout(() => setMounted(false), outMs);
    return () => clearTimeout(id);
  }, [open, outMs]);

  const rendered = Boolean(open) || mounted;
  return { rendered, closing: rendered && !open };
}
