import ContactManager from "@/components/dashboard/ContactManager/ContactManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function ContactPage() {
  return <ProtectedDashboardPage permission="contact.view"><ContactManager /></ProtectedDashboardPage>;
}
