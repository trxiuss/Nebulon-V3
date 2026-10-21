import RoleManager from "@/components/dashboard/RoleManager/RoleManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export default function RolesPage() {
  return <ProtectedDashboardPage permission="roles.view"><RoleManager /></ProtectedDashboardPage>;
}
