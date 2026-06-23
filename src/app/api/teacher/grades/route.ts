import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type TeacherCtx = {
  schoolId: string;
  teacherId: string | null;
  userId: string;
};

async function resolveTeacher(): Promise<TeacherCtx | { error: NextResponse }> {
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

async function resolveTermId(admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>, schoolId: string, term: string | null) {
  if (!term) return null;
  const { data } = await admin.from("terms").select("id").eq("school_id", schoolId).eq("name", term).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/** Prefill: existing grades for an evaluation matching class+subject+term+title. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const term = url.searchParams.get("term");
    const title = url.searchParams.get("title");
    if (!classId || !subjectId || !title) {
      return NextResponse.json({ grades: [], evaluationId: null });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();
    const termId = await resolveTermId(admin, ctx.schoolId, term);

    let evalQuery = admin
      .from("evaluations")
      .select("id")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("title", title);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);
    const { data: evalRow } = await evalQuery.maybeSingle();
    const evaluationId = (evalRow as { id?: string } | null)?.id ?? null;
    if (!evaluationId) return NextResponse.json({ grades: [], evaluationId: null });

    const { data: gradeRows } = await admin
      .from("grades")
      .select("student_id, score")
      .eq("evaluation_id", evaluationId)
      .range(0, 5000);

    const grades = ((gradeRows as Array<{ student_id: unknown; score: unknown }>) ?? []).map((g) => ({
      studentId: String(g.student_id),
      score: Number(g.score),
    }));
    return NextResponse.json({ grades, evaluationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Create/reuse an evaluation and upsert the entered grades. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      classId?: string;
      subjectId?: string;
      term?: string;
      title?: string;
      coefficient?: number;
      grades?: { studentId: string; score: number | null }[];
    };
    const { classId, subjectId, term } = body;
    const title = (body.title ?? "").trim();
    const coefficient = Number(body.coefficient ?? 1) || 1;
    const entries = (body.grades ?? []).filter((g) => g && g.studentId);

    if (!classId || !subjectId || !title) {
      return NextResponse.json({ message: "Classe, matière et titre requis." }, { status: 400 });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    const admin = await createSupabaseAdminServerClient();
    const termId = await resolveTermId(admin, ctx.schoolId, term ?? null);

    // Find or create the evaluation (identity = class + subject + term + title).
    let evalQuery = admin
      .from("evaluations")
      .select("id")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("title", title);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);
    const { data: existingEval } = await evalQuery.maybeSingle();

    let evaluationId = (existingEval as { id?: string } | null)?.id ?? null;
    if (!evaluationId) {
      const { data: inserted, error: insErr } = await admin
        .from("evaluations")
        .insert({
          school_id: ctx.schoolId,
          class_id: classId,
          subject_id: subjectId,
          title,
          max_score: 20,
          evaluation_date: new Date().toISOString().slice(0, 10),
          coefficient,
          term_id: termId,
          teacher_id: ctx.teacherId,
          created_by: ctx.userId,
        } as never)
        .select("id")
        .single();
      if (insErr || !inserted) {
        return NextResponse.json({ message: insErr?.message ?? "Création évaluation échouée" }, { status: 400 });
      }
      evaluationId = String((inserted as { id: string }).id);
    } else if (coefficient) {
      await admin.from("evaluations").update({ coefficient }).eq("id", evaluationId);
    }

    // Split into scores to upsert vs cleared scores to delete.
    const toUpsert = entries.filter((g) => g.score !== null && Number.isFinite(Number(g.score)));
    const toDelete = entries.filter((g) => g.score === null).map((g) => g.studentId);

    if (toUpsert.length > 0) {
      const rows = toUpsert.map((g) => ({
        school_id: ctx.schoolId,
        evaluation_id: evaluationId,
        student_id: g.studentId,
        term_id: termId,
        score: Math.max(0, Math.min(20, Number(g.score))),
      }));
      const { error: upErr } = await admin
        .from("grades")
        .upsert(rows as never, { onConflict: "evaluation_id,student_id" });
      if (upErr) return NextResponse.json({ message: upErr.message }, { status: 400 });
    }

    if (toDelete.length > 0) {
      await admin.from("grades").delete().eq("evaluation_id", evaluationId).in("student_id", toDelete);
    }

    return NextResponse.json({ ok: true, evaluationId, saved: toUpsert.length, cleared: toDelete.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
