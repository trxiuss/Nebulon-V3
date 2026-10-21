"use client";

import Reveal from "@/components/public/Reveal/Reveal";
import TechIcon from "@/components/public/TechIcon/TechIcon";
import { useLanguage } from "@/context/LanguageContext";
import { PRESET_ICON_CLASSES } from "@/lib/preset-icons";
import "@/components/public/Button/Button.css";
import "@/components/public/PluginCard/PluginCard.css";

const COUNT_ICON_CLASSES = { download: "fa-solid fa-download", eye: "fa-solid fa-eye" };
const ACTION_ICON_CLASSES = {
  download: "fa-solid fa-download",
  eye: "fa-solid fa-eye",
  purchase: "fa-solid fa-cart-shopping",
  github: "fa-brands fa-github"
};

export default function PluginCard({ item, delay }) {
  const { t, locale } = useLanguage();

  const title = locale === "tr" ? item.title.tr : item.title.en || item.title.tr;
  const desc = locale === "tr" ? item.desc.tr : item.desc.en || item.desc.tr;
  const countIcon = COUNT_ICON_CLASSES[item.countIconType] || COUNT_ICON_CLASSES.download;
  const actionIcon = ACTION_ICON_CLASSES[item.actionIconType] || ACTION_ICON_CLASSES.download;
  const actionLabel = item.actionType === "github"
    ? t("plugins.github")
    : item.actionType === "purchase"
    ? t("plugins.purchase")
    : item.actionType === "view"
      ? t("plugins.view")
      : t("plugins.download");
  const isPaid = item.pricingType === "paid";

  return (
    <Reveal className="plugin-card card-hover-target" delay={delay}>
      {item.downloads != null && (
        <div className="dl-badge">
          <i className={countIcon}></i>{" "}
          {new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR").format(item.downloads)}
        </div>
      )}
      <div className="icon-wrap">
        {item.imageType === "preset" ? (
          <i
            className={PRESET_ICON_CLASSES[item.imageValue] || "fa-solid fa-cube"}
            style={{ fontSize: "3.4rem", color: "var(--primary2)" }}
          ></i>
        ) : item.imageValue ? (
          <img src={item.imageValue} alt={title} />
        ) : (
          <i className="fa-solid fa-cube" style={{ fontSize: "3.4rem", color: "var(--primary2)" }}></i>
        )}
      </div>
      <h3>{title}</h3>
      <p className="desc"><span>{desc}</span></p>
      <TechIcon tags={item.techTags} />
      <div className="card-foot">
        <span className={`price${isPaid ? " paid" : ""}`}>{isPaid ? t("plugins.paid") : t("plugins.free")}</span>
        <a href={item.actionUrl} target="_blank" rel="noopener" className="btn-sm">
          <span>{actionLabel}</span> <i className={actionIcon}></i>
        </a>
      </div>
    </Reveal>
  );
}
