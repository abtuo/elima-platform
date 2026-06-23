import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type TeacherCtx = {
  schoolId: string;
  teacherId: string | null;
  userId: string;
};

/**
 * Resolve the authenticated TEACHER context (school + teacher row).
 * Mirrors the inline pattern used across teacher API routes, centralised here
 * so new routes stay consistent without touching the existing ones.
 */
export async function resolveTeacher(): Promise<TeacherCtx | { error: NextResponse }> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) {
    return { error: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  const { data: userRow } = await admin
    .from("users")
    .select("id, role, school_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!userRow || userRow.role !== "TEACHER") {
    return { error: NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 }) };
  }
  const { data: teacherRow } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  return {
    schoolId: String((userRow as { school_id?: string | null }).school_id ?? ""),
    teacherId: (teacherRow as { id?: string } | null)?.id ?? null,
    userId: String(authData.user.id),
  };
}

export async function resolveTermId(
  admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>,
  schoolId: string,
  term: string | null | undefined,
) {
  if (!term) return null;
  const { data } = await admin.from("terms").select("id").eq("school_id", schoolId).eq("name", term).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}
