import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardStats = {
  schoolId: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolCity?: string | null;
  schoolCountry?: string | null;
  schoolStatus?: string | null;
  classesCount: number;
  studentsCount: number;
  teachersCount: number;
  parentsCount: number;
  evaluationsCount: number;
  gradesCount: number;
  attendanceRecordsCount: number;
  conversationsCount: number;
  messagesCount: number;
};

async function countByTable(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, table: string, schoolId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStatsForCurrentUserSchool(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Resolve current school via service role (bypass RLS).
  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("school_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) throw userErr;
  // NOTE: In some environments / datasets, a user can exist without being attached to a school yet.
  // Throwing here crashes the whole dashboard on Vercel (Digest error page).
  // Instead, return safe defaults and let the UI guide the user to configure/attach the school.
  if (!userRow?.school_id) {
    return {
      schoolId: "",
      schoolName: "École (à configurer)",
      schoolLogoUrl: null,
      schoolCity: null,
      schoolCountry: null,
      schoolStatus: null,
      classesCount: 0,
      studentsCount: 0,
      teachersCount: 0,
      parentsCount: 0,
      evaluationsCount: 0,
      gradesCount: 0,
      attendanceRecordsCount: 0,
      conversationsCount: 0,
      messagesCount: 0,
    };
  }

  const schoolId = String(userRow.school_id);
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .select("id, name, city, country, status, logo_url")
    .eq("id", schoolId)
    .maybeSingle();
  if (schoolErr) throw schoolErr;

  // Counts (frequent queries: keep them simple and indexed by school_id)
  const [
    classesCount,
    studentsCount,
    teachersCount,
    parentsCount,
    evaluationsCount,
    gradesCount,
    attendanceRecordsCount,
    conversationsCount,
    messagesCount,
  ] = await Promise.all([
    countByTable(admin, "classes", schoolId),
    countByTable(admin, "students", schoolId),
    countByTable(admin, "teachers", schoolId),
    countByTable(admin, "parents", schoolId),
    countByTable(admin, "evaluations", schoolId),
    countByTable(admin, "grades", schoolId),
    countByTable(admin, "attendance", schoolId),
    countByTable(admin, "conversations", schoolId),
    // messages doesn't have school_id; we approximate by joining via conversations
    (async () => {
      const { data: convIds, error } = await admin
        .from("conversations")
        .select("id")
        .eq("school_id", schoolId);
      if (error) throw error;
      const ids = (convIds ?? []).map((c) => c.id);
      if (ids.length === 0) return 0;
      const { count, error: msgErr } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids);
      if (msgErr) throw msgErr;
      return count ?? 0;
    })(),
  ]);

  return {
    schoolId,
    schoolName: String(school?.name ?? "École"),
    schoolLogoUrl: (school as { logo_url?: string | null } | null)?.logo_url ?? null,
    schoolCity: school?.city ?? null,
    schoolCountry: school?.country ?? null,
    schoolStatus: (school as { status?: string | null } | null)?.status ?? null,
    classesCount,
    studentsCount,
    teachersCount,
    parentsCount,
    evaluationsCount,
    gradesCount,
    attendanceRecordsCount,
    conversationsCount,
    messagesCount,
  };
}

export type AttendanceLevelRow = {
  level: string;
  present: number;
  total: number;
  rate: number;
};

export type DashboardPaymentSummary = {
  totalCollected: number;
  totalExpected: number;
  collectionRate: number;
  collectedGrowthPct: number;
};

export type AtRiskStudentRow = {
  id: string;
  fullName: string;
  className: string;
  level: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

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

export async function getDashboardActorBrief(): Promise<{ fullName: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return { fullName: null };
    const userId = authData.user?.id;
    if (!userId) return { fullName: null };
    const admin = await createSupabaseAdminServerClient();
    const { data } = await admin.from("users").select("full_name").eq("id", userId).maybeSingle();
    return { fullName: (data as { full_name?: string | null } | null)?.full_name ?? null };
  } catch {
    return { fullName: null };
  }
}

export async function getAttendanceByLevelLastDays(schoolId: string, days: number): Promise<AttendanceLevelRow[]> {
  if (!schoolId) return [];
  const admin = await createSupabaseAdminServerClient();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const { data: classes, error: cErr } = await admin.from("classes").select("id, level").eq("school_id", schoolId);
  if (cErr || !classes?.length) return [];

  const classToLevel = new Map<string, string>();
  classes.forEach((c) => {
    classToLevel.set(String((c as { id: string }).id), String((c as { level?: string | null }).level ?? "Autre"));
  });

  const { data: rows, error: aErr } = await admin
    .from("attendance")
    .select("class_id, status")
    .eq("school_id", schoolId)
    .gte("date", fromStr)
    .lte("date", toStr);
  if (aErr) return [];

  const agg = new Map<string, { present: number; total: number }>();
  (rows ?? []).forEach((r) => {
    const cid = String((r as { class_id: string }).class_id);
    const level = classToLevel.get(cid) ?? "Autre";
    const cur = agg.get(level) ?? { present: 0, total: 0 };
    cur.total += 1;
    if ((r as { status: string }).status === "PRESENT") cur.present += 1;
    agg.set(level, cur);
  });

  return Array.from(agg.entries())
    .map(([level, v]) => ({
      level,
      present: v.present,
      total: v.total,
      rate: v.total ? Math.round((v.present / v.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.level.localeCompare(b.level, "fr"));
}

export async function getDashboardPaymentSummaryForCurrentUserSchool(): Promise<DashboardPaymentSummary> {
  const base: DashboardPaymentSummary = {
    totalCollected: 0,
    totalExpected: 0,
    collectionRate: 0,
    collectedGrowthPct: 0,
  };

  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) return base;

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("school_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (userErr || !userRow?.school_id) return base;

  const schoolId = String(userRow.school_id);
  const { data: rows, error } = await admin
    .from("student_payments")
    .select("amount, status, created_at")
    .eq("school_id", schoolId);

  if (error) {
    if (isMissingRelationError(error)) return base;
    throw error;
  }

  const payments = (rows ?? []) as Array<{ amount: number | string; status: string; created_at: string }>;
  const toNum = (v: number | string) => Number(v || 0);
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now);
  d60.setDate(d60.getDate() - 60);

  let totalExpected = 0;
  let totalCollected = 0;
  let currentCollected = 0;
  let previousCollected = 0;
  for (const p of payments) {
    const amount = toNum(p.amount);
    totalExpected += amount;
    if (p.status === "paid") totalCollected += amount;
    const created = new Date(p.created_at);
    if (created >= d30) {
      if (p.status === "paid") currentCollected += amount;
    } else if (created >= d60) {
      if (p.status === "paid") previousCollected += amount;
    }
  }

  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const growthRaw =
    previousCollected > 0 ? ((currentCollected - previousCollected) / previousCollected) * 100 : currentCollected > 0 ? 100 : 0;
  const collectedGrowthPct = Math.round(growthRaw);

  return {
    totalCollected,
    totalExpected,
    collectionRate,
    collectedGrowthPct,
  };
}

export async function getAtRiskStudentsForCurrentUserSchool(limit = 4): Promise<AtRiskStudentRow[]> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) return [];

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("school_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (userErr || !userRow?.school_id) return [];
  const schoolId = String(userRow.school_id);

  const { data: profileRows, error: profileErr } = await admin
    .from("student_learning_profiles")
    .select("student_id, risk_level, academic_risk_score, attendance_risk_score")
    .eq("school_id", schoolId)
    .order("academic_risk_score", { ascending: false })
    .order("attendance_risk_score", { ascending: false })
    .limit(Math.max(limit * 3, 12));

  if (profileErr) {
    if (isMissingRelationError(profileErr)) return [];
    throw profileErr;
  }

  const profiles = (profileRows ?? []) as Array<{
    student_id: string;
    risk_level: "low" | "medium" | "high";
    academic_risk_score: number;
    attendance_risk_score: number;
  }>;
  if (profiles.length === 0) return [];

  const candidateIds = profiles.map((p) => p.student_id);
  const { data: studentRows, error: studentsErr } = await admin
    .from("students")
    .select(
      "id, full_name, class:classes!students_class_id_fkey(name, level)",
    )
    .eq("school_id", schoolId)
    .in("id", candidateIds);
  if (studentsErr) throw studentsErr;

  const byId = new Map(
    ((studentRows ?? []) as Array<{ id: string; full_name: string; class: Array<{ name: string; level: string }> | null }>).map((s) => [
      String(s.id),
      s,
    ]),
  );

  const out: AtRiskStudentRow[] = [];
  for (const p of profiles) {
    const s = byId.get(String(p.student_id));
    if (!s) continue;
    const cls = s.class?.[0];
    out.push({
      id: String(s.id),
      fullName: String(s.full_name ?? ""),
      className: String(cls?.name ?? ""),
      level: String(cls?.level ?? ""),
      riskLevel:
        p.risk_level === "high" ? "HIGH" : p.risk_level === "medium" ? "MEDIUM" : "LOW",
    });
    if (out.length >= limit) break;
  }

  return out;
}
