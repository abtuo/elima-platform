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
      .select("id, full_name, role")
      .eq("id", userId)
      .maybeSingle();
    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow || userRow.role !== "TEACHER") {
      return NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 });
    }

    const { data: teacherRow, error: teacherErr } = await admin
      .from("teachers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (teacherErr) return NextResponse.json({ message: teacherErr.message }, { status: 400 });
    if (!teacherRow?.id) return NextResponse.json({ classes: [], subjects: [], students: [], assignments: [] });

    const { data: assignmentRows, error: assignErr } = await admin
      .from("class_teachers")
      .select(`
        class_id, subject_id,
        class:classes!class_teachers_class_id_fkey(id, name, level, academic_year),
        subject:subjects!class_teachers_subject_id_fkey(id, name)
      `)
      .eq("teacher_id", teacherRow.id);
    if (assignErr) return NextResponse.json({ message: assignErr.message }, { status: 400 });

    const classesMap = new Map<string, { id: string; name: string; level: string; academicYear: string }>();
    const subjectsMap = new Map<string, { id: string; name: string }>();
    const assignments: Array<{ classId: string; className: string; subjectId: string; subjectName: string }> = [];

    (assignmentRows ?? []).forEach((row) => {
      const classItem = (row as { class?: Array<{ id: string; name: string; level: string; academic_year: string }> }).class?.[0];
      const subjectItem = (row as { subject?: Array<{ id: string; name: string }> }).subject?.[0];
      if (classItem) {
        classesMap.set(String(classItem.id), {
          id: String(classItem.id),
          name: String(classItem.name),
          level: String(classItem.level ?? ""),
          academicYear: String(classItem.academic_year ?? ""),
        });
      }
      if (subjectItem) {
        subjectsMap.set(String(subjectItem.id), { id: String(subjectItem.id), name: String(subjectItem.name) });
      }
      if (classItem && subjectItem) {
        assignments.push({
          classId: String(classItem.id),
          className: String(classItem.name),
          subjectId: String(subjectItem.id),
          subjectName: String(subjectItem.name),
        });
      }
    });

    const classIds = Array.from(classesMap.keys());
    let students: Array<{ id: string; fullName: string; classId: string; className: string }> = [];
    if (classIds.length > 0) {
      const { data: studentRows, error: studentsErr } = await admin
        .from("students")
        .select("id, full_name, class_id, class:classes!students_class_id_fkey(name)")
        .in("class_id", classIds)
        .order("full_name", { ascending: true });
      if (studentsErr) return NextResponse.json({ message: studentsErr.message }, { status: 400 });
      students = (studentRows ?? []).map((row) => ({
        id: String(row.id),
        fullName: String((row as { full_name: string }).full_name),
        classId: String((row as { class_id: string }).class_id),
        className: String(((row as { class?: Array<{ name?: string }> }).class?.[0]?.name ?? "")),
      }));
    }

    return NextResponse.json({
      teacher: { id: String(userRow.id), fullName: String(userRow.full_name ?? "") },
      classes: Array.from(classesMap.values()).sort((a, b) => a.name.localeCompare(b.name, "fr")),
      subjects: Array.from(subjectsMap.values()).sort((a, b) => a.name.localeCompare(b.name, "fr")),
      students,
      assignments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
