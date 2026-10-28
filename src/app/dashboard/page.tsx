import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardRootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const roleDashboard = getRoleDashboardPath(session.role);
  redirect(roleDashboard);
}

