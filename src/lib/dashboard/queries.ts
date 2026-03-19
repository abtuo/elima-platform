import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardStats = {
  schoolId: string;
  schoolName: string;
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

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("school_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!userRow?.school_id) throw new Error("Missing school_id for current user");

  const schoolId = String(userRow.school_id);
  const { data: school, error: schoolErr } = await supabase
    .from("schools")
    .select("id, name")
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
    countByTable(supabase, "classes", schoolId),
    countByTable(supabase, "students", schoolId),
    countByTable(supabase, "teachers", schoolId),
    countByTable(supabase, "parents", schoolId),
    countByTable(supabase, "evaluations", schoolId),
    countByTable(supabase, "grades", schoolId),
    countByTable(supabase, "attendance", schoolId),
    countByTable(supabase, "conversations", schoolId),
    // messages doesn't have school_id; we approximate by joining via conversations
    (async () => {
      const { data: convIds, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("school_id", schoolId);
      if (error) throw error;
      const ids = (convIds ?? []).map((c) => c.id);
      if (ids.length === 0) return 0;
      const { count, error: msgErr } = await supabase
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
