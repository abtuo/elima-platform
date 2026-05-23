import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classIdFilter = url.searchParams.get("classId")?.trim() ?? "";

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

    if (classIdFilter) {
      const { data: classOk, error: classVerifyErr } = await admin
        .from("classes")
        .select("id")
        .eq("id", classIdFilter)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (classVerifyErr) return NextResponse.json({ message: classVerifyErr.message }, { status: 400 });
      if (!classOk) return NextResponse.json({ message: "Classe introuvable" }, { status: 404 });
    }

    let classes: Array<{ id: string; name: string; level: string; academic_year: string }> | null = null;
    if (!classIdFilter) {
      const { data: classesData, error: classesErr } = await admin
        .from("classes")
        .select("id, name, level, academic_year")
        .eq("school_id", schoolId)
        .order("level", { ascending: true })
        .order("name", { ascending: true });
      if (classesErr) return NextResponse.json({ message: classesErr.message }, { status: 400 });
      classes = classesData ?? [];
    }

    let studentsQuery = admin
      .from("students")
      .select(
        `id, full_name, registration_number, birth_date, class_id,
         class:classes!students_class_id_fkey(id, name, level, academic_year)`,
      )
      .eq("school_id", schoolId);
    if (classIdFilter) {
      studentsQuery = studentsQuery.eq("class_id", classIdFilter);
    }
    const { data: students, error: studentsErr } = await studentsQuery.order("full_name", { ascending: true });

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
      registration_number: string | null;
      birth_date: string | null;
      class_id: string;
      class: StudentClassRow[] | null;
    };

    let mappedStudents = ((students as StudentRow[]) ?? []).map((student) => {
      const studentClass = student.class?.[0] ?? null;
      return {
        id: String(student.id),
        fullName: String(student.full_name),
        registrationNumber: student.registration_number ? String(student.registration_number) : null,
        birthDate: student.birth_date ? String(student.birth_date) : null,
        classId: String(student.class_id),
        className: String(studentClass?.name ?? ""),
        level: String(studentClass?.level ?? ""),
        academicYear: String(studentClass?.academic_year ?? ""),
      };
    });

    // Alert enrichment can be expensive on large schools; only compute it
    // when a specific class is requested (small result set).
    const studentIds = mappedStudents.map((s) => s.id);
    if (classIdFilter && studentIds.length > 0) {
      const [{ data: gradesRows, error: gradesErr }, { data: attRows, error: attErr }] = await Promise.all([
        admin.from("grades").select("student_id, score").eq("school_id", schoolId).in("student_id", studentIds),
        admin.from("attendance").select("student_id, status").eq("school_id", schoolId).in("student_id", studentIds),
      ]);

      if (gradesErr) return NextResponse.json({ message: gradesErr.message }, { status: 400 });
      if (attErr) return NextResponse.json({ message: attErr.message }, { status: 400 });

      const gradeAgg = new Map<string, { sum: number; n: number }>();
      for (const row of gradesRows ?? []) {
        const sid = String((row as { student_id: string }).student_id);
        const score = Number((row as { score: number }).score);
        const cur = gradeAgg.get(sid) ?? { sum: 0, n: 0 };
        cur.sum += Number.isFinite(score) ? score : 0;
        cur.n += 1;
        gradeAgg.set(sid, cur);
      }

      const attAgg = new Map<string, { total: number; absent: number }>();
      for (const row of attRows ?? []) {
        const sid = String((row as { student_id: string }).student_id);
        const status = String((row as { status: string }).status);
        const cur = attAgg.get(sid) ?? { total: 0, absent: 0 };
        cur.total += 1;
        if (status === "ABSENT") cur.absent += 1;
        attAgg.set(sid, cur);
      }

      mappedStudents = mappedStudents.map((s) => {
        const g = gradeAgg.get(s.id);
        const avg = g && g.n > 0 ? g.sum / g.n : null;
        const lowGrades = avg != null && g!.n >= 2 && avg < 10;

        const a = attAgg.get(s.id);
        const absenceRate = a && a.total >= 5 ? a.absent / a.total : 0;
        const highAbsences = Boolean(a && a.total >= 5 && absenceRate >= 0.25);

        return {
          ...s,
          alerts: {
            lowGrades,
            highAbsences,
            paymentPending: false,
          },
        };
      });
    }

    return NextResponse.json({ classes: classes ?? [], students: mappedStudents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}