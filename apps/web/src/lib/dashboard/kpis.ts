import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type KpiPoint = { date: string; value: number };

export type ClassGradeDistribution = {
  classId: string;
  className: string;
  average: number | null;
  totalGrades: number;
  buckets: {
    below8: number;
    from8To10: number;
    from10To12: number;
    from12To14: number;
    from14To16: number;
    above16: number;
  };
};

export type ClassAttendanceSummary = {
  classId: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
};

export type SubjectAverageSummary = {
  subjectId: string;
  subjectName: string;
  average: number;
  gradesCount: number;
};

export type SchoolKpis = {
  schoolId: string;
  from: string; // ISO date
  to: string; // ISO date

  // High-level counters
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  evaluationsCount: number;
  gradesCount: number;
  attendanceRecordsCount: number;

  // Attendance breakdown within the period
  attendancePresentCount: number;
  attendanceAbsentCount: number;
  attendanceLateCount: number;
  attendancePresenceRate: number; // % within period (present / total)
  attendanceAbsenceRate: number; // % within period (absent / total)
  attendanceLateRate: number; // % within period (late / total)

  // Academic KPIs within the period
  gradesAverageScore: number | null; // /20
  gradesMinScore: number | null; // /20
  gradesMaxScore: number | null; // /20

  // Time series (per day)
  attendanceDailyPresent: KpiPoint[];
  attendanceDailyAbsent: KpiPoint[];
  gradesDailyAverage: KpiPoint[]; // avg(score) per day for evaluation_date
  classGradeDistributions: ClassGradeDistribution[];
  classAttendance: ClassAttendanceSummary[];
  subjectAverages: SubjectAverageSummary[];
};

export type SchoolKpisParams = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  classId?: string;
};

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // 1 decimal
}

function normalizeDate(value: unknown, fallback: string) {
  const s = typeof value === "string" ? value : fallback;
  // keep YYYY-MM-DD if provided, else fallback
  return s.length >= 10 ? s.slice(0, 10) : fallback;
}

async function resolveCurrentUserSchoolId() {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("school_id")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) throw userErr;

  // Keep the dashboard resilient in environments where the session exists
  // but the profile is not fully attached to a school yet.
  // The page can then show safe defaults instead of crashing.
  return userRow?.school_id ? String(userRow.school_id) : null;
}

async function countByTable(admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>, table: string, schoolId: string) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (error) throw error;
  return count ?? 0;
}

export async function getSchoolKpisForCurrentUserSchool(params: SchoolKpisParams): Promise<SchoolKpis> {
  const admin = await createSupabaseAdminServerClient();
  const schoolId = await resolveCurrentUserSchoolId();

  const from = normalizeDate(params.from, new Date(Date.now() - 29 * 86400000).toISOString());
  const to = normalizeDate(params.to, new Date().toISOString());

  if (!schoolId) {
    return {
      schoolId: "",
      from,
      to,
      studentsCount: 0,
      teachersCount: 0,
      classesCount: 0,
      evaluationsCount: 0,
      gradesCount: 0,
      attendanceRecordsCount: 0,
      attendancePresentCount: 0,
      attendanceAbsentCount: 0,
      attendanceLateCount: 0,
      attendancePresenceRate: 0,
      attendanceAbsenceRate: 0,
      attendanceLateRate: 0,
      gradesAverageScore: null,
      gradesMinScore: null,
      gradesMaxScore: null,
      attendanceDailyPresent: [],
      attendanceDailyAbsent: [],
      gradesDailyAverage: [],
      classGradeDistributions: [],
      classAttendance: [],
      subjectAverages: [],
    };
  }

  // High-level counters (full school scope)
  const [
    studentsCount,
    teachersCount,
    classesCount,
    evaluationsCount,
    gradesCount,
    attendanceRecordsCount,
  ] = await Promise.all([
    countByTable(admin, "students", schoolId),
    countByTable(admin, "teachers", schoolId),
    countByTable(admin, "classes", schoolId),
    countByTable(admin, "evaluations", schoolId),
    countByTable(admin, "grades", schoolId),
    countByTable(admin, "attendance", schoolId),
  ]);

  // Attendance breakdown within the period
  // NOTE: attendance.date is a DATE column.
  const attendanceBase = admin
    .from("attendance")
    .select("status, date, class_id")
    .eq("school_id", schoolId)
    .gte("date", from)
    .lte("date", to);
  const attendanceQuery = params.classId ? attendanceBase.eq("class_id", params.classId) : attendanceBase;
  const { data: attendanceRows, error: attendanceErr } = await attendanceQuery;
  if (attendanceErr) throw attendanceErr;
  const attendance = attendanceRows ?? [];
  const attendancePresentCount = attendance.filter((r) => r.status === "PRESENT").length;
  const attendanceAbsentCount = attendance.filter((r) => r.status === "ABSENT").length;
  const attendanceLateCount = attendance.filter((r) => r.status === "LATE").length;
  const attendanceTotal = attendance.length;

  // Grades within period (by evaluation_date)
  // Strategy: fetch evaluations within date range, then fetch grades for those evaluations.
  const evalBase = admin
    .from("evaluations")
    .select("id, evaluation_date, class_id, subject_id")
    .eq("school_id", schoolId)
    .gte("evaluation_date", from)
    .lte("evaluation_date", to);
  const evalQuery = params.classId ? evalBase.eq("class_id", params.classId) : evalBase;
  const { data: evals, error: evalErr } = await evalQuery;
  if (evalErr) throw evalErr;

  const evaluationIds = (evals ?? []).map((e) => e.id).filter(Boolean);
  let gradesAverageScore: number | null = null;
  let gradesMinScore: number | null = null;
  let gradesMaxScore: number | null = null;
  let gradesDailyAverage: KpiPoint[] = [];

  if (evaluationIds.length > 0) {
    const { data: gradeRows, error: gradeErr } = await admin
      .from("grades")
      .select("score, created_at, evaluation_id")
      .eq("school_id", schoolId)
      .in("evaluation_id", evaluationIds);
    if (gradeErr) throw gradeErr;

    const grades = gradeRows ?? [];
    if (grades.length > 0) {
      const scores = grades.map((g) => Number(g.score));
      const sum = scores.reduce((a, b) => a + b, 0);
      gradesAverageScore = Math.round((sum / scores.length) * 10) / 10;
      gradesMinScore = Math.min(...scores);
      gradesMaxScore = Math.max(...scores);
    }

    // Build daily average from evaluation_date (more meaningful than created_at)
    const evalDateById = new Map<string, string>();
    (evals ?? []).forEach((e) => {
      evalDateById.set(String(e.id), String(e.evaluation_date));
    });
    const byDate = new Map<string, { sum: number; n: number }>();
    (gradeRows ?? []).forEach((g) => {
      const d = evalDateById.get(String(g.evaluation_id));
      if (!d) return;
      const key = String(d).slice(0, 10);
      const cur = byDate.get(key) ?? { sum: 0, n: 0 };
      cur.sum += Number(g.score);
      cur.n += 1;
      byDate.set(key, cur);
    });
    gradesDailyAverage = Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, agg]) => ({ date, value: Math.round((agg.sum / Math.max(1, agg.n)) * 10) / 10 }));
  }

  // Build attendance time series (daily counts)
  const byDatePresent = new Map<string, number>();
  const byDateAbsent = new Map<string, number>();
  attendance.forEach((r) => {
    const d = String(r.date).slice(0, 10);
    if (r.status === "PRESENT") byDatePresent.set(d, (byDatePresent.get(d) ?? 0) + 1);
    if (r.status === "ABSENT") byDateAbsent.set(d, (byDateAbsent.get(d) ?? 0) + 1);
  });
  const dates = Array.from(new Set([...byDatePresent.keys(), ...byDateAbsent.keys()])).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const attendanceDailyPresent = dates.map((d) => ({ date: d, value: byDatePresent.get(d) ?? 0 }));
  const attendanceDailyAbsent = dates.map((d) => ({ date: d, value: byDateAbsent.get(d) ?? 0 }));

  const { data: classRows, error: classErr } = await admin
    .from("classes")
    .select("id, name, level")
    .eq("school_id", schoolId);
  if (classErr) throw classErr;
  const classNames = new Map(
    ((classRows ?? []) as Array<{ id: string; name: string; level: string | null }>).map((row) => [
      String(row.id),
      String(row.name),
    ]),
  );

  const evalMetaById = new Map<string, { classId: string; subjectId: string | null }>();
  const subjectIds = new Set<string>();
  ((evals ?? []) as Array<{ id: string; class_id?: string | null; subject_id?: string | null }>).forEach((evaluation) => {
    const subjectId = evaluation.subject_id ? String(evaluation.subject_id) : null;
    evalMetaById.set(String(evaluation.id), {
      classId: String(evaluation.class_id ?? ""),
      subjectId,
    });
    if (subjectId) subjectIds.add(subjectId);
  });

  const subjectNames = new Map<string, string>();
  if (subjectIds.size > 0) {
    const { data: subjectRows, error: subjectErr } = await admin
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .in("id", Array.from(subjectIds));
    if (subjectErr) throw subjectErr;
    ((subjectRows ?? []) as Array<{ id: string; name: string }>).forEach((row) => {
      subjectNames.set(String(row.id), String(row.name));
    });
  }

  const classGradeAgg = new Map<
    string,
    {
      sum: number;
      n: number;
      buckets: ClassGradeDistribution["buckets"];
    }
  >();
  const subjectAgg = new Map<string, { sum: number; n: number }>();
  if (evaluationIds.length > 0) {
    const { data: distributionGrades, error: distErr } = await admin
      .from("grades")
      .select("score, evaluation_id")
      .eq("school_id", schoolId)
      .in("evaluation_id", evaluationIds);
    if (distErr) throw distErr;
    for (const grade of distributionGrades ?? []) {
      const meta = evalMetaById.get(String((grade as { evaluation_id: string }).evaluation_id));
      if (!meta?.classId) continue;
      const score = Number((grade as { score: number | string }).score);
      const cur =
        classGradeAgg.get(meta.classId) ??
        {
          sum: 0,
          n: 0,
          buckets: { below8: 0, from8To10: 0, from10To12: 0, from12To14: 0, from14To16: 0, above16: 0 },
        };
      cur.sum += Number.isFinite(score) ? score : 0;
      cur.n += 1;
      if (score < 8) cur.buckets.below8 += 1;
      else if (score < 10) cur.buckets.from8To10 += 1;
      else if (score < 12) cur.buckets.from10To12 += 1;
      else if (score < 14) cur.buckets.from12To14 += 1;
      else if (score < 16) cur.buckets.from14To16 += 1;
      else cur.buckets.above16 += 1;
      classGradeAgg.set(meta.classId, cur);

      if (meta.subjectId) {
        const subj = subjectAgg.get(meta.subjectId) ?? { sum: 0, n: 0 };
        subj.sum += Number.isFinite(score) ? score : 0;
        subj.n += 1;
        subjectAgg.set(meta.subjectId, subj);
      }
    }
  }

  const classGradeDistributions = Array.from(classGradeAgg.entries())
    .map(([classId, agg]) => ({
      classId,
      className: classNames.get(classId) ?? "Classe",
      average: agg.n ? Math.round((agg.sum / agg.n) * 10) / 10 : null,
      totalGrades: agg.n,
      buckets: agg.buckets,
    }))
    .sort((a, b) => (b.totalGrades - a.totalGrades) || a.className.localeCompare(b.className, "fr"))
    .slice(0, 8);

  const classAttendanceAgg = new Map<string, { present: number; absent: number; late: number }>();
  attendance.forEach((row) => {
    const classId = String((row as { class_id?: string | null }).class_id ?? "");
    if (!classId) return;
    const cur = classAttendanceAgg.get(classId) ?? { present: 0, absent: 0, late: 0 };
    if (row.status === "PRESENT") cur.present += 1;
    else if (row.status === "ABSENT") cur.absent += 1;
    else if (row.status === "LATE") cur.late += 1;
    classAttendanceAgg.set(classId, cur);
  });
  const classAttendance = Array.from(classAttendanceAgg.entries())
    .map(([classId, agg]) => {
      const total = agg.present + agg.absent + agg.late;
      return {
        classId,
        className: classNames.get(classId) ?? "Classe",
        present: agg.present,
        absent: agg.absent,
        late: agg.late,
        rate: safePercent(agg.present, total),
      };
    })
    .sort((a, b) => (b.absent + b.late) - (a.absent + a.late) || a.rate - b.rate)
    .slice(0, 8);

  const subjectAverages = Array.from(subjectAgg.entries())
    .map(([subjectId, agg]) => ({
      subjectId,
      subjectName: subjectNames.get(subjectId) ?? "Matiere",
      average: Math.round((agg.sum / Math.max(1, agg.n)) * 10) / 10,
      gradesCount: agg.n,
    }))
    .sort((a, b) => a.average - b.average || b.gradesCount - a.gradesCount)
    .slice(0, 8);

  return {
    schoolId,
    from,
    to,
    studentsCount,
    teachersCount,
    classesCount,
    evaluationsCount,
    gradesCount,
    attendanceRecordsCount,
    attendancePresentCount,
    attendanceAbsentCount,
    attendanceLateCount,
    attendancePresenceRate: safePercent(attendancePresentCount, attendanceTotal),
    attendanceAbsenceRate: safePercent(attendanceAbsentCount, attendanceTotal),
    attendanceLateRate: safePercent(attendanceLateCount, attendanceTotal),
    gradesAverageScore,
    gradesMinScore,
    gradesMaxScore,
    attendanceDailyPresent,
    attendanceDailyAbsent,
    gradesDailyAverage,
    classGradeDistributions,
    classAttendance,
    subjectAverages,
  };
}
