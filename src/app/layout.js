import { Outfit } from "next/font/google";
import { headers } from "next/headers";
import "@/styles/variables.css";
import "@/styles/globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import InteractionController from "@/components/public/InteractionController/InteractionController";
import BackgroundChrome from "@/components/public/BackgroundChrome/BackgroundChrome";
import Header from "@/components/public/Header/Header";
import Footer from "@/components/public/Footer/Footer";
import ScrollTopButton from "@/components/public/ScrollTopButton/ScrollTopButton";
import LangSwitcher from "@/components/public/LangSwitcher/LangSwitcher";
import ValidationBubble from "@/components/common/ValidationBubble/ValidationBubble";
import { query } from "@/lib/db";
import {
  SITE_URL,
  SITE_DESCRIPTIONS,
  SEO_DEFAULT_LOCALE,
  getGeoLocale,
  buildMetadata
} from "@/lib/seo";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap"
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1
};

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const geoLocale = await getGeoLocale();
  const base = buildMetadata({ path: "/", locale: geoLocale });

  return {
    ...base,
    metadataBase: new URL(SITE_URL),
    manifest: "/assets/favicon/site.webmanifest",
    icons: {
      icon: [
        { url: "/assets/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/assets/favicon/favicon.svg", type: "image/svg+xml" }
      ],
      shortcut: "/assets/favicon/favicon.ico",
      apple: "/assets/favicon/apple-touch-icon.png"
    },
    appleWebApp: {
      title: "Nebulon Project"
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "none" }
    }
  };
}

function buildNavigationJsonLd(locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Nebulon Project",
        inLanguage: locale,
        description: SITE_DESCRIPTIONS[locale] || SITE_DESCRIPTIONS[SEO_DEFAULT_LOCALE]
      },
      {
        "@type": "SiteNavigationElement",
        name: ["Home", "Projects", "Team", "Contact"],
        url: [`${SITE_URL}/`, `${SITE_URL}/projects`, `${SITE_URL}/team`, `${SITE_URL}/contact`]
      }
    ]
  };
}

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const currentPath = headerList.get("x-nebulon-path") || "";
  const isAdminArea = currentPath === "/login" || currentPath.startsWith("/dashboard");
  const geoLocale = await getGeoLocale();
  const navigationJsonLd = buildNavigationJsonLd(geoLocale);

  const [contacts, footerIcons] = isAdminArea
    ? [[], []]
    : await Promise.all([
        query("SELECT button_url, title_tr, title_en, icon_key FROM contact_section ORDER BY display_order IS NULL, display_order ASC, id ASC LIMIT 1"),
        query("SELECT icon_key, url FROM footer_icons ORDER BY display_order ASC, id ASC")
      ]);
  const contact = contacts[0] || null;

  return (
    <html lang={geoLocale} className={outfit.variable}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/devicon/2.17.0/devicon.min.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationJsonLd) }}
        />
      </head>
      <body>
        <LanguageProvider initialLocale={geoLocale}>
          <InteractionController />
          <BackgroundChrome />
          <Header contact={contact} />
          <main>{children}</main>
          <Footer icons={footerIcons} />
          <ScrollTopButton />
          <LangSwitcher />
          <ValidationBubble />
        </LanguageProvider>
      </body>
    </html>
  );
}
