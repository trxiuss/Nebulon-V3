import { query, queryOne } from "@/lib/db";
import DashboardOverview from "@/components/dashboard/DashboardOverview/DashboardOverview";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const [categories, products, team, users, latestProducts, latestTeam] = await Promise.all([
    queryOne("SELECT COUNT(*) as c FROM categories"),
    queryOne("SELECT COUNT(*) as c FROM products"),
    queryOne("SELECT COUNT(*) as c FROM team"),
    queryOne("SELECT COUNT(*) as c FROM users"),
    query(
      `SELECT products.id, products.title_tr, products.title_en, products.image_type, products.image_value,
              products.category_id, products.created_at,
              categories.name_tr as category_tr, categories.name_en as category_en
       FROM products
       LEFT JOIN categories ON categories.id = products.category_id
       ORDER BY products.id DESC LIMIT 5`
    ),
    query("SELECT id, name, role_tr, role_en, avatar_url FROM team ORDER BY id DESC LIMIT 5")
  ]);

  const stats = {
    categories: categories?.c ?? 0,
    products: products?.c ?? 0,
    team: team?.c ?? 0,
    users: users?.c ?? 0,
    earnings: 0
  };

  return (
    <DashboardOverview
      stats={stats}
      latestProducts={latestProducts}
      latestTeam={latestTeam}
    />
  );
}
