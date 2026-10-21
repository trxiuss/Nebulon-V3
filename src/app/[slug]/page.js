import { notFound } from "next/navigation";
import CategorySearchSort from "@/components/public/CategorySearchSort/CategorySearchSort";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { getCategoryProducts } from "@/lib/public-data";
import { queryOne } from "@/lib/db";
import {
  buildMetadata,
  getGeoLocale,
  SEO_DEFAULT_LOCALE,
  SITE_DESCRIPTIONS
} from "@/lib/seo";
import "@/components/public/Reveal/Reveal.css";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "api",
  "dashboard",
  "login",
  "projects",
  "team",
  "contact",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "favicon.ico"
]);

function localizedCategory(category, slug) {
  const titles = {
    tr: category.name_tr || category.name_en || slug,
    en: category.name_en || category.name_tr || slug
  };
  const descriptions = {
    tr: category.description_tr || category.description_en || SITE_DESCRIPTIONS.tr,
    en: category.description_en || category.description_tr || SITE_DESCRIPTIONS.en
  };
  return { titles, descriptions };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug || RESERVED.has(slug)) {
    return buildMetadata({ path: "/projects", locale: SEO_DEFAULT_LOCALE });
  }

  const category = await queryOne("SELECT * FROM categories WHERE slug = ?", [slug]);
  if (!category) {
    return buildMetadata({ path: "/projects", locale: SEO_DEFAULT_LOCALE });
  }

  const geoLocale = await getGeoLocale();
  const { titles, descriptions } = localizedCategory(category, slug);

  return buildMetadata({
    path: `/${slug}`,
    locale: geoLocale,
    title: `${titles[geoLocale] || titles.en} | Nebulon Project`,
    description: descriptions[geoLocale] || descriptions.en
  });
}

export default async function DynamicCategoryPage({ params }) {
  const { slug } = await params;
  if (!slug || RESERVED.has(slug)) notFound();

  const category = await queryOne("SELECT * FROM categories WHERE slug = ?", [slug]);
  if (!category) notFound();

  const items = await getCategoryProducts(slug);
  const { titles } = localizedCategory(category, slug);
  const sub = {
    tr: category.description_tr || category.description_en || "",
    en: category.description_en || category.description_tr || ""
  };

  return (
    <>
      <DynamicTitle titles={titles} />
      <CategorySearchSort
        items={items}
        titleText={titles}
        subText={sub}
        titleKey={null}
        subKey={null}
      />
    </>
  );
}
