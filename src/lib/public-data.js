import { query } from "@/lib/db";
import { safeJsonParse, normalizeSocials } from "@/lib/utils";
import { PRESET_ICON_CLASSES } from "@/lib/preset-icons";
import { fetchCounterValue } from "@/lib/external-counter";

async function parseProduct(row) {
  const apiCount = row.counter_api_url
    ? await fetchCounterValue(row.counter_api_url, row.count_icon_type)
    : null;
  return {
    id: row.id,
    title: { tr: row.title_tr, en: row.title_en },
    desc: { tr: row.short_desc_tr, en: row.short_desc_en },
    imageType: row.image_type,
    imageValue: row.image_value,
    downloads: apiCount ?? (row.download_count === null || row.download_count === undefined
      ? (row.counter_api_url ? 0 : null)
      : Number(row.download_count)),
    countIconType: row.count_icon_type,
    pricingType: row.pricing_type,
    actionType: row.action_type,
    actionIconType: row.action_icon_type,
    actionUrl: row.action_url,
    techTags: safeJsonParse(row.tech_tags, [])
  };
}

export async function getCategoryProducts(slug) {
  const rows = await query(
    `SELECT products.*
     FROM products
     LEFT JOIN categories ON categories.id = products.category_id
     WHERE categories.slug = ? AND products.category_id IS NOT NULL AND products.is_active = ?
     ORDER BY products.id DESC`,
    [slug, 1]
  );
  return Promise.all(rows.map(parseProduct));
}

function parseTeamMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: { tr: row.role_tr, en: row.role_en },
    avatarUrl: row.avatar_url,
    socials: normalizeSocials(safeJsonParse(row.socials, {}))
  };
}

export async function getTeamMembers() {
  const rows = await query(
    "SELECT * FROM team ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  return rows.map(parseTeamMember);
}

export async function getCategoriesWithCounts() {
  const categories = await query(
    "SELECT * FROM categories ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  const activeProducts = await query(
    "SELECT category_id FROM products WHERE category_id IS NOT NULL AND is_active = ?",
    [1]
  );

  const counts = {};
  for (const product of activeProducts) {
    counts[product.category_id] = (counts[product.category_id] || 0) + 1;
  }

  return categories.map((category) => {
    const iconKey = category.icon_key || "";
    const iconClass = PRESET_ICON_CLASSES[iconKey] || "fa-solid fa-folder";
    const colorClass = ["plugins", "software", "webscripts", "bots", "packs"].includes(category.slug)
      ? category.slug
      : "plugins";

    return {
      id: category.id,
      slug: category.slug,
      name: { tr: category.name_tr, en: category.name_en || category.name_tr },
      description: {
        tr: category.description_tr || "",
        en: category.description_en || category.description_tr || ""
      },
      iconKey,
      iconClass,
      colorClass,
      activeProductCount: counts[category.id] || 0,
      displayOrder: category.display_order
    };
  });
}

export async function getPublicStats() {
  const [projects, team, products] = await Promise.all([
    query("SELECT COUNT(*) AS c FROM products WHERE category_id IS NOT NULL AND is_active = ?", [1]),
    query("SELECT COUNT(*) AS c FROM team"),
    query("SELECT counter_api_url, download_count FROM products WHERE count_icon_type = ? AND category_id IS NOT NULL AND is_active = ?", ["download", 1])
  ]);
  const counts = await Promise.all(
    products.map(async (product) => {
      if (product.counter_api_url) {
        const value = await fetchCounterValue(product.counter_api_url, "download");
        if (value !== null) return value;
      }
      return Number(product.download_count || 0);
    })
  );
  return {
    activeProjectCount: Number(projects[0]?.c || 0),
    teamCount: Number(team[0]?.c || 0),
    totalDownloads: counts.reduce((total, count) => total + count, 0)
  };
}
