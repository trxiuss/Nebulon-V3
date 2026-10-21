import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell/DashboardShell";

export const runtime = "edge";

export const metadata = {
  title: "Nebulon Project",
  robots: { index: false, follow: false }
};

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <DashboardShell username={session.username}>{children}</DashboardShell>;
}
