import {
  getAttendanceByLevelLastDays,
  getDashboardActorBrief,
  getDashboardStatsForCurrentUserSchool,
} from "@/lib/dashboard/queries";
import { getSchoolKpisForCurrentUserSchool } from "@/lib/dashboard/kpis";
import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const stats = await getDashboardStatsForCurrentUserSchool();
  const actor = await getDashboardActorBrief();

  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 6);
  const from = formatDateIso(fromDate);
  const to = formatDateIso(toDate);

  const [kpis7, attendanceByLevel] = await Promise.all([
    getSchoolKpisForCurrentUserSchool({ from, to }),
    stats.schoolId ? getAttendanceByLevelLastDays(stats.schoolId, 7) : Promise.resolve([]),
  ]);

  const location = [stats.schoolCity, stats.schoolCountry].filter(Boolean).join(", ");
  const hasClasses = stats.classesCount > 0;

  return (
    <AdminDashboardHome
      schoolName={stats.schoolName || "École (à configurer)"}
      location={location}
      hasClasses={hasClasses}
      actorName={actor.fullName}
      stats={stats}
      kpis7={kpis7}
      attendanceByLevel={attendanceByLevel}
    />
  );
}
