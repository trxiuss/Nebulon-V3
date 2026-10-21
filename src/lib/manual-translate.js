import { translateBidirectional } from "@/lib/translate";
import { hasPermission } from "@/lib/permissions";

export function wantsManualEn(body) {
  return body?.manual_en === true || body?.manual_en === "true";
}

export function canUseManualEn(user) {
  return hasPermission(user?.permissions, "translate.manual");
}

export async function resolveLocalized(trInput, manualEnInput, manual) {
  const tr = typeof trInput === "string" ? trInput.trim() : "";
  if (!tr) return { tr: "", en: "" };

  if (manual) {
    const en = typeof manualEnInput === "string" ? manualEnInput.trim() : "";
    return { tr, en: en || tr };
  }

  return translateBidirectional(tr);
}
