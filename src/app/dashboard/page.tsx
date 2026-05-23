import {
  getAtRiskStudentsForCurrentUserSchool,
  getDashboardPaymentSummaryForCurrentUserSchool,
  getDashboardStatsForCurrentUserSchool,
} from "@/lib/dashboard/queries";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";
import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const stats = await getDashboardStatsForCurrentUserSchool();
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = formatDateIso(fromDate);
  const to = formatDateIso(toDate);

  const [kpis7, paymentSummary, atRiskStudents] = await Promise.all([
    getSchoolKpisForCurrentUserSchool({ from, to }),
    getDashboardPaymentSummaryForCurrentUserSchool(),
    getAtRiskStudentsForCurrentUserSchool(4),
  ]);

  const location = [stats.schoolCity, stats.schoolCountry].filter(Boolean).join(", ");
  return (
    <AdminDashboardHome
      schoolName={stats.schoolName || "École (à configurer)"}
      location={location}
      stats={stats}
      kpis7={kpis7}
      paymentSummary={paymentSummary}
      atRiskStudents={atRiskStudents}
    />
  );
}
