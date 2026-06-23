import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/dashboard/queries";
import { getDashboardStatsForCurrentUserSchool } from "@/lib/dashboard/queries";
import type { AnalyticsAlert } from "@/lib/types";
import { getRecommendations } from "@/lib/analytics/recommendationService";

export type TrendDirection = "up" | "down" | "neutral";

export type CockpitActionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  severity: "high" | "medium" | "low";
};

export type ClassPerformanceRow = {
  classId: string;
  className: string;
  level: string;
  average: number;
  studentCount: number;
};

export type AtRiskStudentDetail = {
  id: string;
  fullName: string;
  className: string;
  level: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  averageScore: number | null;
  attendanceRate: number | null;
};

export type CockpitNotificationRow = {
  id: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  channel: string;
  createdAt: string;
};

export type CockpitRecentActivity = {
  id: string;
  label: string;
  detail: string;
  time: string;
};

export type MonthlyPerformancePoint = {
  label: string;
  current: number | null;
  previous: number | null;
};

export type LevelPerformanceSeries = {
  level: string;
  points: { label: string; average: number | null }[];
};

export type AdminCockpitData = {
  stats: DashboardStats;
  currentTermName: string | null;
  kpis: {
    activeStudents: number;
    studentsTrend: TrendDirection;
    teachers: number;
    todayPresenceRate: number;
    todayPresenceTrend: TrendDirection;
    schoolAverage: number | null;
    schoolAverageTrendPct: number | null;
    whatsappSentThisWeek: number;
    whatsappTrend: TrendDirection;
  };
  actionItems: CockpitActionItem[];
  academicPerformance: {
    monthlySeries: MonthlyPerformancePoint[];
    levelSeries: LevelPerformanceSeries[];
    comparisonPct: number | null;
    topClasses: ClassPerformanceRow[];
    watchClasses: ClassPerformanceRow[];
  };
  attendance: {
    todayRate: number;
    todayAbsent: number;
    todayLate: number;
    todayPresent: number;
    topAbsentClasses: { className: string; absentCount: number }[];
    weeklyTrend: { date: string; rate: number }[];
    recentSchoolDays: AttendanceSchoolDayBreakdown[];
  };
  atRiskStudents: AtRiskStudentDetail[];
  communication: {
    sent: number;
    pending: number;
    failed: number;
    channel: string;
    recent: CockpitNotificationRow[];
  };
  recentActivity: CockpitRecentActivity[];
  recommendations: AnalyticsAlert[];
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type AttendanceSchoolDayBreakdown = {
  date: string;
  present: number;
  justifiedAbsent: number;
  unjustifiedAbsent: number;
  late: number;
};

function isSchoolDay(d: Date) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

/** Les N derniers jours ouvrés (lun–ven), du plus ancien au plus récent. */
function getLastSchoolDays(from: Date, count: number): string[] {
  const days: string[] = [];
  const cursor = new Date(from);
  while (days.length < count) {
    if (isSchoolDay(cursor)) days.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { month: "short" });
}

function trendFromDelta(delta: number, invert = false): TrendDirection {
  const effective = invert ? -delta : delta;
  if (effective > 0.5) return "up";
  if (effective < -0.5) return "down";
  return "neutral";
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function levelRank(level: string) {
  const normalized = level
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("6")) return 10;
  if (normalized.includes("5")) return 20;
  if (normalized.includes("4")) return 30;
  if (normalized.includes("3")) return 40;
  if (normalized.includes("2nde") || normalized.includes("2de") || normalized.includes("seconde")) return 50;
  if (normalized.includes("1ere") || normalized.includes("1re") || normalized.includes("premiere")) return 60;
  if (normalized.includes("terminale") || normalized.includes("tle")) return 70;
  return 999;
}

function compareLevels(a: string, b: string) {
  const ra = levelRank(a);
  const rb = levelRank(b);
  return ra - rb || a.localeCompare(b, "fr", { numeric: true });
}

function riskReason(row: {
  average_score: number;
  attendance_rate: number;
  performance_trend: string;
  risk_level: string;
}): string {
  const reasons: string[] = [];
  if (Number(row.average_score) < 10) reasons.push("Moyenne faible");
  if (Number(row.attendance_rate) < 80) reasons.push("Absences");
  if (String(row.performance_trend).toUpperCase() === "DECLINING") reasons.push("Notes en baisse");
  if (reasons.length === 0 && row.risk_level === "HIGH") return "Alerte académique";
  return reasons[0] ?? "Suivi recommandé";
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /Could not find the table/i.test(msg) ||
    /does not exist/i.test(msg)
  );
}

async function resolveSchoolId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) return null;
  const { data: userRow } = await admin.from("users").select("school_id").eq("id", authData.user.id).maybeSingle();
  return userRow?.school_id ? String(userRow.school_id) : null;
}

function emptyCockpit(stats: DashboardStats): AdminCockpitData {
  return {
    stats,
    currentTermName: null,
    kpis: {
      activeStudents: 0,
      studentsTrend: "neutral",
      teachers: 0,
      todayPresenceRate: 0,
      todayPresenceTrend: "neutral",
      schoolAverage: null,
      schoolAverageTrendPct: null,
      whatsappSentThisWeek: 0,
      whatsappTrend: "neutral",
    },
    actionItems: [],
    academicPerformance: { monthlySeries: [], levelSeries: [], comparisonPct: null, topClasses: [], watchClasses: [] },
    attendance: {
      todayRate: 0,
      todayAbsent: 0,
      todayLate: 0,
      todayPresent: 0,
      topAbsentClasses: [],
      weeklyTrend: [],
      recentSchoolDays: [],
    },
    atRiskStudents: [],
    communication: { sent: 0, pending: 0, failed: 0, channel: "WhatsApp", recent: [] },
    recentActivity: [],
    recommendations: [],
  };
}

export async function getAdminCockpitData(): Promise<AdminCockpitData> {
  const stats = await getDashboardStatsForCurrentUserSchool();
  if (!stats.schoolId) return emptyCockpit(stats);

  const admin = await createSupabaseAdminServerClient();
  const schoolId = stats.schoolId;
  const today = new Date();
  const todayStr = isoDate(today);
  const weekStart = startOfWeek(today);
  const weekStartIso = weekStart.toISOString();
  const d7 = new Date(today);
  d7.setDate(d7.getDate() - 6);
  const d7Str = isoDate(d7);
  const d14 = new Date(today);
  d14.setDate(d14.getDate() - 13);
  const d14Str = isoDate(d14);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    schoolRow,
    todayAttendanceRes,
    weekAttendanceRes,
    weekNotifRes,
    allNotifRes,
    recentNotifRes,
    metricsRes,
    classesRes,
    studentsRes,
    reportsRes,
    recentEvalsRes,
    grades6mRes,
    prevTermGradesRes,
  ] = await Promise.all([
    admin
      .from("schools")
      .select("current_term_id, terms:terms!schools_current_term_id_fkey(name, start_date, end_date)")
      .eq("id", schoolId)
      .maybeSingle(),
    admin.from("attendance").select("status, class_id").eq("school_id", schoolId).eq("date", todayStr),
    admin
      .from("attendance")
      .select("status, date, justified")
      .eq("school_id", schoolId)
      .gte("date", d14Str)
      .lte("date", todayStr),
    admin.from("notifications").select("status").eq("school_id", schoolId).gte("created_at", weekStartIso),
    admin.from("notifications").select("status").eq("school_id", schoolId),
    admin
      .from("notifications")
      .select("id, message, status, channel, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("academic_metrics")
      .select("student_id, average_score, attendance_rate, performance_trend, risk_level, alert_flag, computed_at")
      .eq("school_id", schoolId)
      .order("computed_at", { ascending: false }),
    admin.from("classes").select("id, name, level").eq("school_id", schoolId),
    admin.from("students").select("id, full_name, class_id").eq("school_id", schoolId),
    admin.from("reports").select("id, student_id, created_at").eq("school_id", schoolId),
    admin
      .from("evaluations")
      .select("id, class_id, evaluation_date")
      .eq("school_id", schoolId)
      .gte("evaluation_date", d14Str),
    admin
      .from("evaluations")
      .select("id, class_id, evaluation_date, max_score")
      .eq("school_id", schoolId)
      .gte("evaluation_date", isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1))),
    admin
      .from("evaluations")
      .select("id, class_id, evaluation_date, max_score")
      .eq("school_id", schoolId)
      .gte("evaluation_date", isoDate(new Date(today.getFullYear(), today.getMonth() - 11, 1)))
      .lt("evaluation_date", isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1))),
  ]);

  const currentTermJoin = (schoolRow.data as { terms?: Array<{ name: string }> | null } | null)?.terms?.[0];
  let currentTermName = currentTermJoin?.name ?? null;
  if (!currentTermName) {
    const { data: activeTerm } = await admin
      .from("terms")
      .select("name")
      .eq("school_id", schoolId)
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .maybeSingle();
    currentTermName = activeTerm?.name ?? null;
  }

  const todayRows = todayAttendanceRes.data ?? [];
  const todayPresent = todayRows.filter((r) => r.status === "PRESENT").length;
  const todayAbsent = todayRows.filter((r) => r.status === "ABSENT").length;
  const todayLate = todayRows.filter((r) => r.status === "LATE").length;
  const todayTotal = todayRows.length;
  const todayRate = todayTotal ? Math.round((todayPresent / todayTotal) * 1000) / 10 : 0;

  const weekRows = weekAttendanceRes.data ?? [];
  const byDay = new Map<string, { present: number; total: number }>();
  const breakdownByDay = new Map<
    string,
    { present: number; justifiedAbsent: number; unjustifiedAbsent: number; late: number }
  >();
  weekRows.forEach((r) => {
    const d = String(r.date).slice(0, 10);
    const cur = byDay.get(d) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.status === "PRESENT") cur.present += 1;
    byDay.set(d, cur);

    const breakdown = breakdownByDay.get(d) ?? {
      present: 0,
      justifiedAbsent: 0,
      unjustifiedAbsent: 0,
      late: 0,
    };
    if (r.status === "PRESENT") breakdown.present += 1;
    else if (r.status === "ABSENT") {
      if ((r as { justified?: boolean }).justified) breakdown.justifiedAbsent += 1;
      else breakdown.unjustifiedAbsent += 1;
    } else if (r.status === "LATE") breakdown.late += 1;
    breakdownByDay.set(d, breakdown);
  });
  const weeklyTrend = Array.from(byDay.entries())
    .filter(([date]) => date >= d7Str)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, rate: v.total ? Math.round((v.present / v.total) * 1000) / 10 : 0 }));

  const recentSchoolDays = getLastSchoolDays(today, 4).map((date) => {
    const breakdown = breakdownByDay.get(date) ?? {
      present: 0,
      justifiedAbsent: 0,
      unjustifiedAbsent: 0,
      late: 0,
    };
    return { date, ...breakdown };
  });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = isoDate(yesterday);
  const yesterdayData = byDay.get(yesterdayStr);
  const yesterdayRate = yesterdayData?.total ? (yesterdayData.present / yesterdayData.total) * 100 : null;
  const todayPresenceTrend = trendFromDelta(
    yesterdayRate !== null ? todayRate - yesterdayRate : 0,
  );

  const classMap = new Map(
    ((classesRes.data ?? []) as Array<{ id: string; name: string; level: string | null }>).map((c) => [
      String(c.id),
      { name: String(c.name), level: String(c.level ?? "") },
    ]),
  );

  const absentByClass = new Map<string, number>();
  todayRows
    .filter((r) => r.status === "ABSENT")
    .forEach((r) => {
      const cid = String((r as { class_id: string }).class_id);
      absentByClass.set(cid, (absentByClass.get(cid) ?? 0) + 1);
    });
  const topAbsentClasses = Array.from(absentByClass.entries())
    .map(([classId, absentCount]) => ({
      className: classMap.get(classId)?.name ?? "Classe",
      absentCount,
    }))
    .sort((a, b) => b.absentCount - a.absentCount)
    .slice(0, 4);

  const weekNotifs = weekNotifRes.error && isMissingRelationError(weekNotifRes.error) ? [] : weekNotifRes.data ?? [];
  const allNotifs = allNotifRes.error && isMissingRelationError(allNotifRes.error) ? [] : allNotifRes.data ?? [];
  const whatsappSentThisWeek = weekNotifs.filter((n) => n.status === "SENT").length;
  const prevWeekNotifRes = await admin
    .from("notifications")
    .select("status")
    .eq("school_id", schoolId)
    .gte("created_at", prevWeekStart.toISOString())
    .lt("created_at", weekStartIso);
  const prevWeekSent =
    prevWeekNotifRes.error && isMissingRelationError(prevWeekNotifRes.error)
      ? 0
      : (prevWeekNotifRes.data ?? []).filter((n) => n.status === "SENT").length;
  const whatsappTrend = trendFromDelta(whatsappSentThisWeek - prevWeekSent);

  const commSent = allNotifs.filter((n) => n.status === "SENT").length;
  const commPending = allNotifs.filter((n) => n.status === "PENDING").length;
  const commFailed = allNotifs.filter((n) => n.status === "FAILED").length;

  const recentNotifs: CockpitNotificationRow[] = (
    recentNotifRes.error && isMissingRelationError(recentNotifRes.error) ? [] : recentNotifRes.data ?? []
  ).map((n) => ({
    id: String(n.id),
    message: String(n.message).slice(0, 120),
    status: n.status as CockpitNotificationRow["status"],
    channel: String(n.channel ?? "WHATSAPP"),
    createdAt: String(n.created_at),
  }));

  const latestMetricByStudent = new Map<
    string,
    {
      average_score: number;
      attendance_rate: number;
      performance_trend: string;
      risk_level: string;
      alert_flag: boolean;
    }
  >();
  if (!metricsRes.error) {
    (metricsRes.data ?? []).forEach((m) => {
      const sid = String(m.student_id);
      if (!latestMetricByStudent.has(sid)) {
        latestMetricByStudent.set(sid, {
          average_score: Number(m.average_score),
          attendance_rate: Number(m.attendance_rate),
          performance_trend: String(m.performance_trend),
          risk_level: String(m.risk_level),
          alert_flag: Boolean(m.alert_flag),
        });
      }
    });
  }

  const metricValues = Array.from(latestMetricByStudent.values());
  const schoolAverage =
    metricValues.length > 0
      ? Math.round((metricValues.reduce((a, b) => a + b.average_score, 0) / metricValues.length) * 10) / 10
      : null;

  const studentMap = new Map(
    ((studentsRes.data ?? []) as Array<{ id: string; full_name: string; class_id: string }>).map((s) => [
      String(s.id),
      s,
    ]),
  );

  const atRiskCandidates = Array.from(latestMetricByStudent.entries())
    .filter(([, m]) => m.alert_flag || m.risk_level === "MEDIUM" || m.risk_level === "HIGH")
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a[1].risk_level as keyof typeof order] ?? 3) - (order[b[1].risk_level as keyof typeof order] ?? 3);
    });

  const atRiskStudents: AtRiskStudentDetail[] = atRiskCandidates.slice(0, 6).map(([studentId, m]) => {
    const s = studentMap.get(studentId);
    const cls = s ? classMap.get(String(s.class_id)) : undefined;
    return {
      id: studentId,
      fullName: String(s?.full_name ?? "Élève"),
      className: cls?.name ?? "",
      level: cls?.level ?? "",
      riskLevel: m.risk_level as AtRiskStudentDetail["riskLevel"],
      reason: riskReason(m),
      averageScore: m.average_score,
      attendanceRate: m.attendance_rate,
    };
  });

  const highRiskCount = atRiskCandidates.filter(([, m]) => m.risk_level === "HIGH" || m.alert_flag).length;

  const studentsCount = stats.studentsCount;
  const reportsCount = (reportsRes.data ?? []).length;
  const unpublishedReports = Math.max(0, studentsCount - reportsCount);

  const recentEvalClassIds = new Set(
    ((recentEvalsRes.data ?? []) as Array<{ class_id: string }>).map((e) => String(e.class_id)),
  );
  const classesWithoutRecentGrades = (classesRes.data ?? []).filter(
    (c) => !recentEvalClassIds.has(String((c as { id: string }).id)),
  ).length;

  const actionItems: CockpitActionItem[] = [
    {
      id: "absents",
      label: "Élèves absents aujourd'hui",
      count: todayAbsent,
      href: "/dashboard/attendance",
      severity: (todayAbsent > 10 ? "high" : todayAbsent > 0 ? "medium" : "low") as CockpitActionItem["severity"],
    },
    {
      id: "notif-failed",
      label: "Notifications WhatsApp en échec",
      count: commFailed,
      href: "/dashboard/messages",
      severity: (commFailed > 0 ? "high" : "low") as CockpitActionItem["severity"],
    },
    {
      id: "reports",
      label: "Bulletins non publiés",
      count: unpublishedReports,
      href: "/dashboard/reports",
      severity: (unpublishedReports > 20 ? "high" : unpublishedReports > 0 ? "medium" : "low") as CockpitActionItem["severity"],
    },
    {
      id: "no-grades",
      label: "Classes sans notes récentes",
      count: classesWithoutRecentGrades,
      href: "/dashboard/classes",
      severity: (classesWithoutRecentGrades > 3 ? "medium" : "low") as CockpitActionItem["severity"],
    },
    {
      id: "high-risk",
      label: "Élèves à risque élevé",
      count: highRiskCount,
      href: "/dashboard/students",
      severity: (highRiskCount > 5 ? "high" : highRiskCount > 0 ? "medium" : "low") as CockpitActionItem["severity"],
    },
  ].filter((item) => item.count > 0);

  const eval6m = (grades6mRes.data ?? []) as Array<{
    id: string;
    class_id: string;
    evaluation_date: string;
    max_score: number;
  }>;
  const evalPrev = (prevTermGradesRes.data ?? []) as Array<{
    id: string;
    class_id: string;
    evaluation_date: string;
    max_score: number;
  }>;
  const allEvalIds = [...eval6m, ...evalPrev].map((e) => e.id);

  let monthlySeries: MonthlyPerformancePoint[] = [];
  let levelSeries: LevelPerformanceSeries[] = [];
  let comparisonPct: number | null = null;
  let topClasses: ClassPerformanceRow[] = [];
  let watchClasses: ClassPerformanceRow[] = [];

  if (allEvalIds.length > 0) {
    const gradeRows: Array<{ score: number; evaluation_id: string; student_id: string }> = [];

    // Supabase/PostgREST rejects very large `.in(...)` URLs and caps result
    // sizes. Reading by small evaluation batches keeps the demo dashboard
    // populated even for the rich seed dataset (principal school).
    for (const evalChunk of chunkArray(allEvalIds, 40)) {
      const { data, error } = await admin
        .from("grades")
        .select("score, evaluation_id, student_id")
        .eq("school_id", schoolId)
        .in("evaluation_id", evalChunk)
        .range(0, 50000);
      if (!error) {
        gradeRows.push(...((data ?? []) as Array<{ score: number; evaluation_id: string; student_id: string }>));
      }
    }

    const evalDateById = new Map<string, string>();
    const evalMetaById = new Map<string, { classId: string; maxScore: number }>();
    eval6m.forEach((e) => evalDateById.set(String(e.id), String(e.evaluation_date).slice(0, 10)));
    evalPrev.forEach((e) => evalDateById.set(String(e.id), String(e.evaluation_date).slice(0, 10)));
    [...eval6m, ...evalPrev].forEach((e) => {
      evalMetaById.set(String(e.id), {
        classId: String(e.class_id),
        maxScore: Number(e.max_score ?? 20) || 20,
      });
    });

    const currentByMonth = new Map<string, { sum: number; n: number }>();
    const previousByMonth = new Map<string, { sum: number; n: number }>();
    const levelByMonth = new Map<string, Map<string, { sum: number; n: number }>>();
    const cutoff = isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1));

    gradeRows.forEach((g) => {
      const d = evalDateById.get(String(g.evaluation_id));
      if (!d) return;
      const meta = evalMetaById.get(String(g.evaluation_id));
      if (!meta) return;
      const score20 = (Number(g.score) / (meta?.maxScore ?? 20)) * 20;
      const monthKey = d.slice(0, 7);
      const bucket = d >= cutoff ? currentByMonth : previousByMonth;
      const cur = bucket.get(monthKey) ?? { sum: 0, n: 0 };
      cur.sum += score20;
      cur.n += 1;
      bucket.set(monthKey, cur);

      if (d >= cutoff) {
        const level = classMap.get(meta.classId)?.level || "Niveau";
        const byMonth = levelByMonth.get(level) ?? new Map<string, { sum: number; n: number }>();
        const levelCur = byMonth.get(monthKey) ?? { sum: 0, n: 0 };
        levelCur.sum += score20;
        levelCur.n += 1;
        byMonth.set(monthKey, levelCur);
        levelByMonth.set(level, byMonth);
      }
    });

    const monthKeys = Array.from(currentByMonth.keys()).sort();
    monthlySeries = monthKeys.map((mk) => {
      const cur = currentByMonth.get(mk);
      const prevKey = `${Number(mk.slice(0, 4)) - 1}${mk.slice(4)}`;
      const prev = previousByMonth.get(prevKey) ?? previousByMonth.get(mk);
      return {
        label: monthLabel(`${mk}-01`),
        current: cur ? Math.round((cur.sum / cur.n) * 10) / 10 : null,
        previous: prev ? Math.round((prev.sum / prev.n) * 10) / 10 : null,
      };
    });

    levelSeries = Array.from(levelByMonth.entries())
      .map(([level, byMonth]) => ({
        level,
        points: monthKeys.map((mk) => {
          const cur = byMonth.get(mk);
          return {
            label: monthLabel(`${mk}-01`),
            average: cur ? Math.round((cur.sum / cur.n) * 10) / 10 : null,
          };
        }),
      }))
      .filter((series) => series.points.some((p) => p.average !== null))
      .sort((a, b) => compareLevels(a.level, b.level));

    const curAvg =
      monthlySeries.filter((p) => p.current !== null).reduce((a, p) => a + (p.current ?? 0), 0) /
      Math.max(1, monthlySeries.filter((p) => p.current !== null).length);
    const prevAvg =
      monthlySeries.filter((p) => p.previous !== null).reduce((a, p) => a + (p.previous ?? 0), 0) /
      Math.max(1, monthlySeries.filter((p) => p.previous !== null).length);
    comparisonPct = prevAvg > 0 ? Math.round(((curAvg - prevAvg) / prevAvg) * 100) : null;

    const classScores = new Map<string, { sum: number; n: number; students: Set<string> }>();
    gradeRows.forEach((g) => {
      const evalId = String(g.evaluation_id);
      const meta = evalMetaById.get(evalId);
      if (!meta) return;
      const classId = meta.classId;
      const score20 = (Number(g.score) / meta.maxScore) * 20;
      const cur = classScores.get(classId) ?? { sum: 0, n: 0, students: new Set() };
      cur.sum += score20;
      cur.n += 1;
      cur.students.add(String(g.student_id));
      classScores.set(classId, cur);
    });

    const classPerf: ClassPerformanceRow[] = Array.from(classScores.entries())
      .filter(([, v]) => v.n >= 3)
      .map(([classId, v]) => ({
        classId,
        className: classMap.get(classId)?.name ?? "Classe",
        level: classMap.get(classId)?.level ?? "Niveau",
        average: Math.round((v.sum / v.n) * 10) / 10,
        studentCount: v.students.size,
      }))
      .sort((a, b) => b.average - a.average);

    const bestByLevel = new Map<string, ClassPerformanceRow>();
    for (const row of classPerf) {
      const current = bestByLevel.get(row.level);
      if (!current || row.average > current.average) {
        bestByLevel.set(row.level, row);
      }
    }
    topClasses = Array.from(bestByLevel.values()).sort((a, b) => compareLevels(a.level, b.level));

    // Demo rule: a class below 12/20 needs attention.
    watchClasses = [...classPerf].filter((row) => row.average < 12).sort((a, b) => a.average - b.average);
  }

  const schoolAverageTrendPct = comparisonPct;

  // Premières briques IA: recommandations issues des services analytics isolés.
  let recommendations: AnalyticsAlert[] = [];
  try {
    recommendations = await getRecommendations(schoolId);
  } catch {
    recommendations = [];
  }

  const recentActivity: CockpitRecentActivity[] = [
    ...recentNotifs.slice(0, 2).map((n) => ({
      id: `notif-${n.id}`,
      label: n.status === "SENT" ? "Notification envoyée" : n.status === "FAILED" ? "Notification échouée" : "Notification en attente",
      detail: n.message,
      time: n.createdAt,
    })),
    ...(reportsRes.data ?? []).slice(0, 2).map((r) => ({
      id: `report-${r.id}`,
      label: "Bulletin généré",
      detail: "Document disponible pour un élève",
      time: String((r as { created_at: string }).created_at),
    })),
  ].slice(0, 5);

  return {
    stats,
    currentTermName,
    kpis: {
      activeStudents: stats.studentsCount,
      studentsTrend: "neutral",
      teachers: stats.teachersCount,
      todayPresenceRate: todayRate,
      todayPresenceTrend,
      schoolAverage,
      schoolAverageTrendPct,
      whatsappSentThisWeek,
      whatsappTrend,
    },
    actionItems,
    academicPerformance: { monthlySeries, levelSeries, comparisonPct, topClasses, watchClasses },
    attendance: {
      todayRate,
      todayAbsent,
      todayLate,
      todayPresent,
      topAbsentClasses,
      weeklyTrend,
      recentSchoolDays,
    },
    atRiskStudents,
    communication: {
      sent: commSent,
      pending: commPending,
      failed: commFailed,
      channel: "WhatsApp",
      recent: recentNotifs,
    },
    recentActivity,
    recommendations,
  };
}
