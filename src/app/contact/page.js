import ContactPageClient from "@/routes/Contact/ContactPageClient";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { query } from "@/lib/db";
import { buildMetadata, getGeoLocale, PAGE_TITLES } from "@/lib/seo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const geoLocale = await getGeoLocale();
  return buildMetadata({ path: "/contact", locale: geoLocale });
}

export default async function ContactPage() {
  const items = await query(
    "SELECT * FROM contact_section ORDER BY display_order IS NULL, display_order ASC, id ASC"
  );
  return (
    <>
      <DynamicTitle titles={PAGE_TITLES["/contact"]} suffix={false} />
      <ContactPageClient items={items} />
    </>
  );
}
