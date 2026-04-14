import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTeacherMatricule, generateTeacherInitialCode } from "@/lib/teacher-access";

type TeacherRow = { id: string; user_id: string };

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ message: "École introuvable" }, { status: 404 });
    if (userRow.role !== "SCHOOL_ADMIN" && userRow.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }

    const { data: teachersData, error: teachersErr } = await admin
      .from("teachers")
      .select("id, user_id")
      .eq("school_id", userRow.school_id);
    if (teachersErr) return NextResponse.json({ message: teachersErr.message }, { status: 400 });

    const teachers = (teachersData ?? []) as TeacherRow[];
    if (!teachers.length) return NextResponse.json({ codes: [] });

    const userIds = teachers.map((teacher) => teacher.user_id);
    const { data: usersData, error: usersErr } = await admin
      .from("users")
      .select("id, full_name, email")
      .in("id", userIds);
    if (usersErr) return NextResponse.json({ message: usersErr.message }, { status: 400 });
    const usersById = new Map((usersData ?? []).map((u) => [String(u.id), u]));

    const results: Array<{ teacherId: string; fullName: string; email: string; matricule: string; code: string }> = [];
    for (const teacher of teachers) {
      const profile = usersById.get(teacher.user_id);
      const email = String(profile?.email ?? "").trim().toLowerCase();
      if (!email) continue;

      const matricule = buildTeacherMatricule(teacher.id);
      const code = generateTeacherInitialCode(5);

      const currentAuth = await admin.auth.admin.getUserById(teacher.user_id);
      const currentMeta = (currentAuth.data.user?.user_metadata ?? {}) as Record<string, unknown>;

      const { error: updateErr } = await admin.auth.admin.updateUserById(teacher.user_id, {
        password: code,
        user_metadata: {
          ...currentMeta,
          teacher_matricule: matricule,
          teacher_must_change_code: true,
          teacher_temp_code_generated_at: new Date().toISOString(),
        },
      });
      if (updateErr) continue;

      results.push({
        teacherId: teacher.id,
        fullName: String(profile?.full_name ?? "Enseignant"),
        email,
        matricule,
        code,
      });
    }

    return NextResponse.json({ codes: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
