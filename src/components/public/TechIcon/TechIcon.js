import { TECH_TAG_ICON_CLASSES } from "@/lib/preset-icons";

export default function TechIcon({ tags }) {
  const list = Array.isArray(tags) ? tags.filter((tag) => TECH_TAG_ICON_CLASSES[tag]) : [];
  if (list.length === 0) return null;

  const label = list.join(", ");

  return (
    <span className={`tech${list.length > 1 ? " tech-multi" : ""}`} title={label}>
      {list.map((tag) => (
        <i key={tag} className={`${TECH_TAG_ICON_CLASSES[tag]} colored`}></i>
      ))}
    </span>
  );
}
