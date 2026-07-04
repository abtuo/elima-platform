import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher, resolveTermId } from "@/lib/teacher/server";

type GradeEntry = { studentId: string; score: number | null };

async function getGradesForEvaluation(
  admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>,
  evaluationId: string,
) {
  const { data: gradeRows, error: gradeErr } = await admin
    .from("grades")
    .select("student_id, score")
    .eq("evaluation_id", evaluationId)
    .range(0, 5000);
  if (gradeErr) throw new Error(gradeErr.message);

  return ((gradeRows as Array<{ student_id: unknown; score: unknown }>) ?? []).map((grade) => ({
    studentId: String(grade.student_id),
    score: Number(grade.score),
  }));
}

/** List evaluations, or load one evaluation with its grades. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const term = url.searchParams.get("term");
    const title = url.searchParams.get("title");
    const evaluationIdParam = url.searchParams.get("evaluationId");

    if (!classId || !subjectId) {
      return NextResponse.json({ evaluations: [], grades: [], evaluationId: null });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId, subjectId);
    if (assignmentError) return assignmentError;

    const termId = await resolveTermId(admin, ctx.schoolId, term);

    if (evaluationIdParam) {
      const { data: evalRow, error: evalErr } = await admin
        .from("evaluations")
        .select("id, title, coefficient, max_score, evaluation_date, term_id")
        .eq("school_id", ctx.schoolId)
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("id", evaluationIdParam)
        .maybeSingle();
      if (evalErr) return NextResponse.json({ message: evalErr.message }, { status: 400 });
      if (!evalRow) return NextResponse.json({ grades: [], evaluationId: null, evaluation: null });

      const grades = await getGradesForEvaluation(admin, evaluationIdParam);
      const evaluation = evalRow as { id: string; title: string; coefficient: number; max_score: number; evaluation_date: string; term_id: string | null };
      return NextResponse.json({ grades, evaluationId: evaluationIdParam, evaluation });
    }

    let evalQuery = admin
      .from("evaluations")
      .select("id, title, coefficient, max_score, evaluation_date, created_at")
      .eq("school_id", ctx.schoolId)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .order("evaluation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);
    if (title?.trim()) evalQuery = evalQuery.eq("title", title.trim());

    const { data: evalRows, error: evalErr } = await evalQuery;
    if (evalErr) return NextResponse.json({ message: evalErr.message }, { status: 400 });

    const evaluations = ((evalRows as Array<{ id: string; title: string; coefficient: number; max_score: number; evaluation_date: string; created_at: string }>) ?? []).map(
      (evaluation) => ({
        id: String(evaluation.id),
        title: String(evaluation.title),
        coefficient: Number(evaluation.coefficient ?? 1),
        maxScore: Number(evaluation.max_score ?? 20),
        evaluationDate: String(evaluation.evaluation_date ?? ""),
        createdAt: String(evaluation.created_at ?? ""),
      }),
    );

    if (title?.trim()) {
      const first = evaluations[0];
      if (!first) return NextResponse.json({ grades: [], evaluationId: null, evaluation: null, evaluations: [] });
      const grades = await getGradesForEvaluation(admin, first.id);
      return NextResponse.json({ grades, evaluationId: first.id, evaluation: first, evaluations });
    }

    const evalIds = evaluations.map((evaluation) => evaluation.id);
    const counts = new Map<string, number>();
    if (evalIds.length > 0) {
      const { data: gradeRows, error: gradeErr } = await admin
        .from("grades")
        .select("evaluation_id")
        .in("evaluation_id", evalIds)
        .range(0, 20000);
      if (gradeErr) return NextResponse.json({ message: gradeErr.message }, { status: 400 });
      for (const grade of (gradeRows as Array<{ evaluation_id: unknown }>) ?? []) {
        const id = String(grade.evaluation_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      evaluations: evaluations.map((evaluation) => ({
        ...evaluation,
        gradeCount: counts.get(evaluation.id) ?? 0,
      })),
      grades: [],
      evaluationId: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Create/update an evaluation and upsert entered grades. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      evaluationId?: string | null;
      classId?: string;
      subjectId?: string;
      term?: string;
      title?: string;
      coefficient?: number;
      grades?: GradeEntry[];
    };

    const classId = body.classId;
    const subjectId = body.subjectId;
    const title = (body.title ?? "").trim();
    const coefficient = Number(body.coefficient ?? 1) || 1;
    const entries = (body.grades ?? []).filter((grade) => grade?.studentId);

    if (!classId || !subjectId || !title) {
      return NextResponse.json({ message: "Classe, matiere et titre requis." }, { status: 400 });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId, subjectId);
    if (assignmentError) return assignmentError;

    const termId = await resolveTermId(admin, ctx.schoolId, body.term ?? null);
    let evaluationId = body.evaluationId ? String(body.evaluationId) : null;

    if (evaluationId) {
      const { data: existing, error: existingErr } = await admin
        .from("evaluations")
        .select("id")
        .eq("id", evaluationId)
        .eq("school_id", ctx.schoolId)
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .maybeSingle();
      if (existingErr) return NextResponse.json({ message: existingErr.message }, { status: 400 });
      if (!existing) return NextResponse.json({ message: "Evaluation introuvable." }, { status: 404 });

      const { error: updateErr } = await admin
        .from("evaluations")
        .update({
          title,
          coefficient,
          term_id: termId,
          teacher_id: ctx.teacherId,
          created_by: ctx.userId,
        })
        .eq("id", evaluationId)
        .eq("school_id", ctx.schoolId);
      if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });
    } else {
      let evalQuery = admin
        .from("evaluations")
        .select("id")
        .eq("school_id", ctx.schoolId)
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("title", title);
      if (termId) evalQuery = evalQuery.eq("term_id", termId);
      const { data: existingEval, error: findErr } = await evalQuery.maybeSingle();
      if (findErr) return NextResponse.json({ message: findErr.message }, { status: 400 });
      evaluationId = (existingEval as { id?: string } | null)?.id ?? null;

      if (!evaluationId) {
        const { data: inserted, error: insertErr } = await admin
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
        if (insertErr || !inserted) {
          return NextResponse.json({ message: insertErr?.message ?? "Creation evaluation echouee" }, { status: 400 });
        }
        evaluationId = String((inserted as { id: string }).id);
      }
    }

    const toUpsert = entries.filter((grade) => grade.score !== null && Number.isFinite(Number(grade.score)));
    const toDelete = entries.filter((grade) => grade.score === null).map((grade) => grade.studentId);

    if (toUpsert.length > 0) {
      const studentIds = toUpsert.map((grade) => grade.studentId);
      const { data: allowedStudents, error: studentsErr } = await admin
        .from("students")
        .select("id")
        .eq("school_id", ctx.schoolId)
        .eq("class_id", classId)
        .in("id", studentIds);
      if (studentsErr) return NextResponse.json({ message: studentsErr.message }, { status: 400 });
      const allowed = new Set(((allowedStudents as Array<{ id: string }>) ?? []).map((student) => String(student.id)));

      const rows = toUpsert
        .filter((grade) => allowed.has(grade.studentId))
        .map((grade) => ({
          school_id: ctx.schoolId,
          evaluation_id: evaluationId,
          student_id: grade.studentId,
          score: Math.max(0, Math.min(20, Number(grade.score))),
        }));

      if (rows.length > 0) {
        const { error: upsertErr } = await admin
          .from("grades")
          .upsert(rows as never, { onConflict: "evaluation_id,student_id" });
        if (upsertErr) return NextResponse.json({ message: upsertErr.message }, { status: 400 });
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteErr } = await admin
        .from("grades")
        .delete()
        .eq("evaluation_id", evaluationId)
        .in("student_id", toDelete);
      if (deleteErr) return NextResponse.json({ message: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, evaluationId, saved: toUpsert.length, cleared: toDelete.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
