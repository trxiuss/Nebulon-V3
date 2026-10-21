"use client";

import { usePathname } from "next/navigation";
import Reveal from "@/components/public/Reveal/Reveal";
import T from "@/components/common/T/T";
import { footerIconClass } from "@/lib/preset-icons";
import "@/components/public/Footer/Footer.css";

export default function Footer({ icons = [] }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/dashboard")) return null;

  return (
    <footer key={pathname}>
      <div className="footer-inner">
        <Reveal as="div" className="footer-top">
          <p><span><T k="footer.text" /></span></p>
          {icons.length > 0 && <div className="footer-icons" data-count={Math.min(icons.length, 3)}>{icons.slice(0, 9).map((item) => (
            <a key={`${item.icon_key}-${item.url}`} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.icon_key} data-icon={item.icon_key}>
              {item.icon_key === "x-twitter" ? <span className="nebulon-x-icon" aria-hidden="true">𝕏</span> : <i className={footerIconClass(item.icon_key)}></i>}
            </a>
          ))}</div>}
        </Reveal>
        <div className="footer-bottom">
          <Reveal as="span" className="footer-powered">
            powered by <strong>NebulonProject</strong>
          </Reveal>
        </div>
      </div>
    </footer>
  );
}
