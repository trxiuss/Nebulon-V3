import HomePageClient from "@/routes/Home/HomePageClient";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { getPublicStats } from "@/lib/public-data";
import { buildMetadata, getGeoLocale, PAGE_TITLES } from "@/lib/seo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const geoLocale = await getGeoLocale();
  return buildMetadata({ path: "/", locale: geoLocale });
}

export default async function HomePage() {
  const stats = await getPublicStats();
  return (
    <>
      <DynamicTitle titles={PAGE_TITLES["/"]} suffix={false} />
      <HomePageClient {...stats} />
    </>
  );
}
