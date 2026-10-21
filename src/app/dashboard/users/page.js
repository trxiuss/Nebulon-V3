import UserManager from "@/components/dashboard/UserManager/UserManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function UsersPage() {
  return <ProtectedDashboardPage permission="users.view"><UserManager /></ProtectedDashboardPage>;
}
