import { getSession } from "@/lib/session";
import { loadUserWithPermissions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import AccessDenied from "@/components/dashboard/AccessDenied/AccessDenied";

export default async function ProtectedDashboardPage({ permission, children }) {
  const session = await getSession();
  const user = session ? await loadUserWithPermissions(session.uid) : null;

  const list = Array.isArray(permission) ? permission : [permission];
  const allowed = user ? list.some((item) => hasPermission(user.permissions, item)) : false;

  if (!allowed) {
    return <AccessDenied />;
  }

  return children;
}
