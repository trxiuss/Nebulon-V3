import { query } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";

function withAlternates(url) {
  return {
    languages: {
      en: `${url}?lang=en`,
      tr: `${url}?lang=tr`,
      "x-default": url
    }
  };
}

export default async function sitemap() {
  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/projects", priority: 0.9, changeFrequency: "weekly" },
    { path: "/team", priority: 0.8, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" }
  ];

  let categories = [];
  try {
    categories = await query("SELECT slug FROM categories ORDER BY id ASC");
  } catch (err) {
    categories = [];
  }

  const staticEntries = staticRoutes.map((route) => {
    const url = `${SITE_URL}${route.path || "/"}`;
    return {
      url,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: withAlternates(url)
    };
  });

  const categoryEntries = (categories || [])
    .filter((row) => row && row.slug)
    .map((row) => {
      const url = `${SITE_URL}/${row.slug}`;
      return {
        url,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: withAlternates(url)
      };
    });

  return [...staticEntries, ...categoryEntries];
}
