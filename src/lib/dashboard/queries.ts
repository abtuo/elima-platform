import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardStats = {
  schoolId: string;
  schoolName: string;
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
    .select("id, name, city, country, status")
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
