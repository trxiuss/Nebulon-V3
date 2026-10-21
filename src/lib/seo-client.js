export const SITE_URL = "https://nebulonproject.com";
const SEO_LOCALES = ["en", "tr"];
export const SEO_DEFAULT_LOCALE = "en";

const OG_LOCALE = { en: "en_US", tr: "tr_TR" };

export const SITE_NAME = "Nebulon Project";

const SITE_TITLES = {
  en: "Nebulon Project",
  tr: "Nebulon Project"
};

export const SITE_DESCRIPTIONS = {
  en: "Nebulon Project builds free, high-performance software, from Minecraft plugins to modern web applications.",
  tr: "Nebulon Project, Minecraft eklentilerinden modern web uygulamalarına kadar ücretsiz ve yüksek performanslı yazılımlar geliştirir."
};

export const PAGE_TITLES = {
  "/": { en: "Nebulon Project", tr: "Nebulon Project" },
  "/projects": { en: "Projects | Nebulon Project", tr: "Projeler | Nebulon Project" },
  "/team": { en: "Team | Nebulon Project", tr: "Ekibimiz | Nebulon Project" },
  "/contact": { en: "Contact | Nebulon Project", tr: "İletişim | Nebulon Project" }
};

const PAGE_DESCRIPTIONS = {
  "/": SITE_DESCRIPTIONS,
  "/projects": {
    en: "Browse all Nebulon Project products: Minecraft plugins, web applications and other free developer tools.",
    tr: "Tüm Nebulon Project ürünlerini keşfedin: Minecraft eklentileri, web uygulamaları ve diğer ücretsiz geliştirici araçları."
  },
  "/team": {
    en: "Meet the developers and contributors behind Nebulon Project.",
    tr: "Nebulon Project'i hayata geçiren geliştiricilerle ve katkı sağlayanlarla tanışın."
  },
  "/contact": {
    en: "Get in touch with the Nebulon Project team for support, feedback or collaboration.",
    tr: "Destek, geri bildirim veya iş birliği için Nebulon Project ekibiyle iletişime geçin."
  }
};

function normalizeLocale(value) {
  const locale = String(value || "").toLowerCase();
  if (locale.startsWith("tr")) return "tr";
  if (locale.startsWith("en")) return "en";
  return null;
}

function buildAlternates(path) {
  const clean = path === "/" ? "" : path;
  const base = `${SITE_URL}${clean || "/"}`;
  return {
    canonical: base,
    languages: {
      en: `${base}?lang=en`,
      tr: `${base}?lang=tr`,
      "x-default": base
    }
  };
}

export function buildMetadata({ path, locale, title, description }) {
  const activeLocale = normalizeLocale(locale) || SEO_DEFAULT_LOCALE;
  const resolvedTitle =
    title || (PAGE_TITLES[path] ? PAGE_TITLES[path][activeLocale] : SITE_TITLES[activeLocale]);
  const resolvedDescription =
    description ||
    (PAGE_DESCRIPTIONS[path]
      ? PAGE_DESCRIPTIONS[path][activeLocale]
      : SITE_DESCRIPTIONS[activeLocale]);
  const clean = path === "/" ? "" : path;
  const url = `${SITE_URL}${clean || "/"}`;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: buildAlternates(path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[activeLocale],
      alternateLocale: SEO_LOCALES.filter((item) => item !== activeLocale).map(
        (item) => OG_LOCALE[item]
      ),
      url,
      title: resolvedTitle,
      description: resolvedDescription,
      images: []
    },
    twitter: {
      card: "summary",
      title: resolvedTitle,
      description: resolvedDescription
    }
  };
}
