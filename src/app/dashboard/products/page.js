import ProductManager from "@/components/dashboard/ProductManager/ProductManager";
import ProtectedDashboardPage from "@/components/dashboard/ProtectedDashboardPage/ProtectedDashboardPage";

export const runtime = "edge";

export default function ProductsPage() {
  return <ProtectedDashboardPage permission="products.view"><ProductManager /></ProtectedDashboardPage>;
}
