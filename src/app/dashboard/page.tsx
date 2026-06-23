import { getAdminCockpitData } from "@/lib/dashboard/cockpit";
import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";

export default async function DashboardPage() {
  const data = await getAdminCockpitData();
  return <AdminDashboardHome data={data} />;
}
