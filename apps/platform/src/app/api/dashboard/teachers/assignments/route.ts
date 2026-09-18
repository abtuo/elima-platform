import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { teacherId?: string; subjectId?: string; classIds?: string[] }
      | null;
    const teacherId = String(body?.teacherId ?? "").trim();
    const subjectId = String(body?.subjectId ?? "").trim();
    const classIds = Array.isArray(body?.classIds) ? body!.classIds.map(String).filter(Boolean) : [];

    if (!teacherId || !subjectId || classIds.length === 0) {
      return NextResponse.json({ message: "teacherId, subjectId et classIds requis." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: actorRow, error: actorErr } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (actorErr) return NextResponse.json({ message: actorErr.message }, { status: 400 });
    if (!actorRow?.school_id) return NextResponse.json({ message: "École introuvable" }, { status: 404 });
    if (actorRow.role !== "SCHOOL_ADMIN" && actorRow.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }
    const schoolId = String(actorRow.school_id);

    const { data: teacherRow } = await admin
      .from("teachers")
      .select("id")
      .eq("id", teacherId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!teacherRow) return NextResponse.json({ message: "Enseignant invalide." }, { status: 404 });

    const { data: subjectRow } = await admin
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!subjectRow) return NextResponse.json({ message: "Matière invalide." }, { status: 404 });

    const { data: validClasses } = await admin
      .from("classes")
      .select("id")
      .eq("school_id", schoolId)
      .in("id", classIds);
    const validClassIds = new Set((validClasses ?? []).map((c) => String(c.id)));
    const filteredClassIds = classIds.filter((id) => validClassIds.has(id));
    if (filteredClassIds.length === 0) {
      return NextResponse.json({ message: "Aucune classe valide pour cette école." }, { status: 400 });
    }

    const classTeacherRows = filteredClassIds.map((classId) => ({
      class_id: classId,
      teacher_id: teacherId,
      subject_id: subjectId,
    }));
    const subjectClassRows = filteredClassIds.map((classId) => ({
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
    }));

    const { error: classTeachersErr } = await admin
      .from("class_teachers")
      .upsert(classTeacherRows, { onConflict: "class_id,teacher_id,subject_id" });
    if (classTeachersErr) return NextResponse.json({ message: classTeachersErr.message }, { status: 400 });

    const { error: teacherSubjectErr } = await admin
      .from("teacher_subject_classes")
      .upsert(subjectClassRows, { onConflict: "teacher_id,class_id,subject_id" });
    if (teacherSubjectErr) return NextResponse.json({ message: teacherSubjectErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, assigned: filteredClassIds.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
