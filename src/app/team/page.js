import TeamPageClient from "@/routes/Team/TeamPageClient";
import DynamicTitle from "@/components/public/DynamicTitle/DynamicTitle";
import { getTeamMembers } from "@/lib/public-data";
import { buildMetadata, getGeoLocale, PAGE_TITLES } from "@/lib/seo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const geoLocale = await getGeoLocale();
  return buildMetadata({ path: "/team", locale: geoLocale });
}

export default async function TeamPage() {
  const members = await getTeamMembers();
  return (
    <>
      <DynamicTitle titles={PAGE_TITLES["/team"]} suffix={false} />
      <TeamPageClient members={members} />
    </>
  );
}
