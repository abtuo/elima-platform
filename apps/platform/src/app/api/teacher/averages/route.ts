import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher, resolveTermId } from "@/lib/teacher/server";

/** Per-student average for a class + subject + term, computed from real grades. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const term = url.searchParams.get("term");

    if (!classId || !subjectId) {
      return NextResponse.json({ averages: [], classAverage: null });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId, subjectId);
    if (assignmentError) return assignmentError;

    const termId = await resolveTermId(admin, ctx.schoolId, term);

    let evalQuery = admin
      .from("evaluations")
      .select("id, max_score")
      .eq("school_id", ctx.schoolId)
      .eq("class_id", classId)
      .eq("subject_id", subjectId);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);

    const { data: evalRows, error: evalErr } = await evalQuery;
    if (evalErr) return NextResponse.json({ message: evalErr.message }, { status: 400 });

    const maxByEval = new Map<string, number>();
    for (const e of (evalRows as Array<{ id: unknown; max_score: unknown }>) ?? []) {
      maxByEval.set(String(e.id), Number(e.max_score ?? 20) || 20);
    }

    const evalIds = Array.from(maxByEval.keys());
    if (evalIds.length === 0) {
      return NextResponse.json({ averages: [], classAverage: null });
    }

    const { data: gradeRows, error: gradeErr } = await admin
      .from("grades")
      .select("student_id, score, evaluation_id")
      .eq("school_id", ctx.schoolId)
      .in("evaluation_id", evalIds)
      .range(0, 20000);
    if (gradeErr) return NextResponse.json({ message: gradeErr.message }, { status: 400 });

    const acc = new Map<string, { sum: number; n: number }>();
    for (const g of (gradeRows as Array<{ student_id: unknown; score: unknown; evaluation_id: unknown }>) ?? []) {
      const max = maxByEval.get(String(g.evaluation_id)) ?? 20;
      const score20 = (Number(g.score) / (max || 20)) * 20;
      const studentId = String(g.student_id);
      const cur = acc.get(studentId) ?? { sum: 0, n: 0 };
      cur.sum += score20;
      cur.n += 1;
      acc.set(studentId, cur);
    }

    const averages = Array.from(acc.entries()).map(([studentId, value]) => ({
      studentId,
      average: Math.round((value.sum / Math.max(1, value.n)) * 10) / 10,
      count: value.n,
    }));

    const classAverage = averages.length
      ? Math.round((averages.reduce((sum, item) => sum + item.average, 0) / averages.length) * 10) / 10
      : null;

    return NextResponse.json({ averages, classAverage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
