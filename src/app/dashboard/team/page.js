import TeamManager from "@/components/dashboard/TeamManager/TeamManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function TeamPage() {
  return <ProtectedDashboardPage permission="team.view"><TeamManager /></ProtectedDashboardPage>;
}
