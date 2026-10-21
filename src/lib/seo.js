import { headers } from "next/headers";
import { SEO_DEFAULT_LOCALE } from "@/lib/seo-client";

export * from "@/lib/seo-client";

async function getRequestCountry() {
  const headerList = await headers();
  const raw =
    headerList.get("cf-ipcountry") ||
    headerList.get("x-vercel-ip-country") ||
    headerList.get("x-nebulon-country") ||
    "";
  return raw.toUpperCase();
}

const TURKISH_COUNTRIES = ["TR", "AZ"];

export async function getGeoLocale() {
  const headerList = await headers();
  const cookie = headerList.get("cookie") || "";
  const saved = cookie.match(/(?:^|;\s*)nebulon-locale=(tr|en)(?:;|$)/)?.[1];
  if (saved) return saved;
  const country = await getRequestCountry();
  if (TURKISH_COUNTRIES.includes(country)) return "tr";
  return SEO_DEFAULT_LOCALE;
}
