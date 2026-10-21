import CategoryManager from "@/components/dashboard/CategoryManager/CategoryManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function CategoriesPage() {
  return <ProtectedDashboardPage permission="categories.view"><CategoryManager /></ProtectedDashboardPage>;
}
