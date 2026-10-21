import ProjectsPageClient from "@/routes/Projects/ProjectsPageClient";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { getCategoriesWithCounts } from "@/lib/public-data";
import { buildMetadata, getGeoLocale, PAGE_TITLES } from "@/lib/seo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const geoLocale = await getGeoLocale();
  return buildMetadata({ path: "/projects", locale: geoLocale });
}

export default async function ProjectsPage() {
  const categories = await getCategoriesWithCounts();
  return (
    <>
      <DynamicTitle titles={PAGE_TITLES["/projects"]} suffix={false} />
      <ProjectsPageClient categories={categories} />
    </>
  );
}
