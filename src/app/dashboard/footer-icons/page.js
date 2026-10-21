import FooterIconManager from "@/components/dashboard/FooterIconManager/FooterIconManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function FooterIconsPage() {
  return <ProtectedDashboardPage permission="footer_icons.view"><FooterIconManager /></ProtectedDashboardPage>;
}
