import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ classes: [], students: [] });

    const schoolId = String(userRow.school_id);

    const { data: classes, error: classesErr } = await admin
      .from("classes")
      .select("id, name, level, academic_year")
      .eq("school_id", schoolId)
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (classesErr) return NextResponse.json({ message: classesErr.message }, { status: 400 });

    const { data: students, error: studentsErr } = await admin
      .from("students")
      .select(
        `id, full_name, class_id,
         class:classes!students_class_id_fkey(id, name, level, academic_year)`,
      )
      .eq("school_id", schoolId)
      .order("full_name", { ascending: true });

    if (studentsErr) return NextResponse.json({ message: studentsErr.message }, { status: 400 });

    type StudentClassRow = {
      id: string;
      name: string;
      level: string;
      academic_year: string;
    };

    type StudentRow = {
      id: string;
      full_name: string;
      class_id: string;
      class: StudentClassRow[] | null;
    };

    const mappedStudents = ((students as StudentRow[]) ?? []).map((student) => {
      const studentClass = student.class?.[0] ?? null;
      return {
      id: String(student.id),
      fullName: String(student.full_name),
      classId: String(student.class_id),
      className: String(studentClass?.name ?? ""),
      level: String(studentClass?.level ?? ""),
      academicYear: String(studentClass?.academic_year ?? ""),
    };
    });

    return NextResponse.json({ classes: classes ?? [], students: mappedStudents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}