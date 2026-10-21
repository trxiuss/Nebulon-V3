import AuditLogManager from "@/components/dashboard/AuditLogManager/AuditLogManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";
export const runtime = "edge";
export const dynamic = "force-dynamic";
export default function AuditLogsPage() {
  return <ProtectedDashboardPage permission={["audit.view", "audit.auth.view"]}><AuditLogManager /></ProtectedDashboardPage>;
}
