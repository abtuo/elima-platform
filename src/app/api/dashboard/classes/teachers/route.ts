import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

/** Teachers assigned to a class, grouped by subject (admin view). */
export async function GET(request: Request) {
  try {
    const classId = new URL(request.url).searchParams.get("classId");
    if (!classId) return NextResponse.json({ teachers: [] });

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }
    const { data: actorRow } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", authData.user.id)
      .maybeSingle();
    const schoolId = (actorRow as { school_id?: string | null } | null)?.school_id;
    const role = (actorRow as { role?: string } | null)?.role;
    if (!schoolId) return NextResponse.json({ message: "École introuvable" }, { status: 404 });
    if (role !== "SCHOOL_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }

    // Ensure the class belongs to the actor's school.
    const { data: classRow } = await admin
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!classRow) return NextResponse.json({ message: "Classe introuvable" }, { status: 404 });

    const { data, error } = await admin
      .from("class_teachers")
      .select(
        `subject_id, teacher_id,
         subject:subjects!class_teachers_subject_id_fkey(name, coefficient),
         teacher:teachers!class_teachers_teacher_id_fkey(
           user:users!teachers_user_id_fkey(full_name)
         )`,
      )
      .eq("class_id", classId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    const pickOne = <T>(v: T[] | T | null | undefined): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

    const teachers = ((data ?? []) as Array<{
      subject_id: string;
      teacher_id: string;
      subject: unknown;
      teacher: unknown;
    }>).map((row) => {
      const subject = pickOne(row.subject as Array<{ name: string; coefficient: number }> | null);
      const teacherWrap = pickOne(row.teacher as Array<{ user: unknown }> | null);
      const userWrap = teacherWrap ? pickOne(teacherWrap.user as Array<{ full_name: string }> | null) : null;
      return {
        subjectId: String(row.subject_id),
        subjectName: String(subject?.name ?? "Matière"),
        coefficient: Number(subject?.coefficient ?? 1),
        teacherId: String(row.teacher_id),
        teacherName: String(userWrap?.full_name ?? "Enseignant"),
      };
    });

    teachers.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "fr"));

    return NextResponse.json({ teachers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
