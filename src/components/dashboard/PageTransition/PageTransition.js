"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "@/components/dashboard/PageTransition/PageTransition.css";

const OUT_MS = 320;

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [rendered, setRendered] = useState({ key: pathname, node: children });
  const [phase, setPhase] = useState("in");
  const timer = useRef(null);

  useEffect(() => {
    if (rendered.key === pathname) {
      setRendered({ key: pathname, node: children });
      return;
    }

    setPhase("out");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setRendered({ key: pathname, node: children });
      setPhase("in");
      window.scrollTo(0, 0);
    }, OUT_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, children]);

  return (
    <div
      key={rendered.key}
      className={`admin-page-transition ${phase === "out" ? "is-leaving" : "is-entering"}`}
    >
      {rendered.node}
    </div>
  );
}
