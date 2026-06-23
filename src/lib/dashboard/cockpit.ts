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
    academicPerformance: { monthlySeries: [], comparisonPct: null, topClasses: [], watchClasses: [] },
    attendance: {
      todayRate: 0,
      todayAbsent: 0,
      todayLate: 0,
      todayPresent: 0,
      topAbsentClasses: [],
      weeklyTrend: [],
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
      .select("status, date")
      .eq("school_id", schoolId)
      .gte("date", d7Str)
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
      .select("id, evaluation_date")
      .eq("school_id", schoolId)
      .gte("evaluation_date", isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1))),
    admin
      .from("evaluations")
      .select("id, evaluation_date")
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
  weekRows.forEach((r) => {
    const d = String(r.date).slice(0, 10);
    const cur = byDay.get(d) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.status === "PRESENT") cur.present += 1;
    byDay.set(d, cur);
  });
  const weeklyTrend = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, rate: v.total ? Math.round((v.present / v.total) * 1000) / 10 : 0 }));

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

  const eval6m = (grades6mRes.data ?? []) as Array<{ id: string; evaluation_date: string }>;
  const evalPrev = (prevTermGradesRes.data ?? []) as Array<{ id: string; evaluation_date: string }>;
  const allEvalIds = [...eval6m, ...evalPrev].map((e) => e.id);

  let monthlySeries: MonthlyPerformancePoint[] = [];
  let comparisonPct: number | null = null;
  let topClasses: ClassPerformanceRow[] = [];
  let watchClasses: ClassPerformanceRow[] = [];

  if (allEvalIds.length > 0) {
    const { data: gradeRows } = await admin
      .from("grades")
      .select("score, evaluation_id, student_id")
      .eq("school_id", schoolId)
      .in("evaluation_id", allEvalIds);

    const evalDateById = new Map<string, string>();
    eval6m.forEach((e) => evalDateById.set(String(e.id), String(e.evaluation_date).slice(0, 10)));
    evalPrev.forEach((e) => evalDateById.set(String(e.id), String(e.evaluation_date).slice(0, 10)));

    const currentByMonth = new Map<string, { sum: number; n: number }>();
    const previousByMonth = new Map<string, { sum: number; n: number }>();
    const cutoff = isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1));

    (gradeRows ?? []).forEach((g) => {
      const d = evalDateById.get(String(g.evaluation_id));
      if (!d) return;
      const monthKey = d.slice(0, 7);
      const bucket = d >= cutoff ? currentByMonth : previousByMonth;
      const cur = bucket.get(monthKey) ?? { sum: 0, n: 0 };
      cur.sum += Number(g.score);
      cur.n += 1;
      bucket.set(monthKey, cur);
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

    const curAvg =
      monthlySeries.filter((p) => p.current !== null).reduce((a, p) => a + (p.current ?? 0), 0) /
      Math.max(1, monthlySeries.filter((p) => p.current !== null).length);
    const prevAvg =
      monthlySeries.filter((p) => p.previous !== null).reduce((a, p) => a + (p.previous ?? 0), 0) /
      Math.max(1, monthlySeries.filter((p) => p.previous !== null).length);
    comparisonPct = prevAvg > 0 ? Math.round(((curAvg - prevAvg) / prevAvg) * 100) : null;

    const evalClassMap = new Map<string, string>();
    const allEvalsWithClass = await admin
      .from("evaluations")
      .select("id, class_id")
      .eq("school_id", schoolId)
      .gte("evaluation_date", d14Str);
    (allEvalsWithClass.data ?? []).forEach((e) => {
      evalClassMap.set(String((e as { id: string }).id), String((e as { class_id: string }).class_id));
    });

    const classScores = new Map<string, { sum: number; n: number; students: Set<string> }>();
    (gradeRows ?? []).forEach((g) => {
      const evalId = String(g.evaluation_id);
      if (!evalClassMap.has(evalId)) return;
      const classId = evalClassMap.get(evalId)!;
      const cur = classScores.get(classId) ?? { sum: 0, n: 0, students: new Set() };
      cur.sum += Number(g.score);
      cur.n += 1;
      cur.students.add(String(g.student_id));
      classScores.set(classId, cur);
    });

    const classPerf: ClassPerformanceRow[] = Array.from(classScores.entries())
      .filter(([, v]) => v.n >= 3)
      .map(([classId, v]) => ({
        classId,
        className: classMap.get(classId)?.name ?? "Classe",
        average: Math.round((v.sum / v.n) * 10) / 10,
        studentCount: v.students.size,
      }))
      .sort((a, b) => b.average - a.average);

    topClasses = classPerf.slice(0, 3);
    watchClasses = [...classPerf].reverse().slice(0, 3);
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
    academicPerformance: { monthlySeries, comparisonPct, topClasses, watchClasses },
    attendance: {
      todayRate,
      todayAbsent,
      todayLate,
      todayPresent,
      topAbsentClasses,
      weeklyTrend,
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
