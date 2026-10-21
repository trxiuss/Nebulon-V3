import SettingsManager from "@/components/dashboard/SettingsManager/SettingsManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export default function SettingsPage() {
  return <ProtectedDashboardPage permission="settings.view"><SettingsManager /></ProtectedDashboardPage>;
}
