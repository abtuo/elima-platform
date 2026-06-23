import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Per-student average for a class + subject + term, computed from real grades.
 * Used by the teacher "Moyennes" page.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const term = url.searchParams.get("term"); // "Trimestre 1" | ...

    if (!classId || !subjectId) {
      return NextResponse.json({ averages: [], classAverage: null });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { data: userRow } = await admin
      .from("users")
      .select("id, role, school_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow || userRow.role !== "TEACHER") {
      return NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 });
    }
    const schoolId = String((userRow as { school_id?: string | null }).school_id ?? "");

    // Resolve term id from its label (optional filter).
    let termId: string | null = null;
    if (term) {
      const { data: termRow } = await admin
        .from("terms")
        .select("id")
        .eq("school_id", schoolId)
        .eq("name", term)
        .maybeSingle();
      termId = (termRow as { id?: string } | null)?.id ?? null;
    }

    // Evaluations for this class + subject (+ term), bounded dataset.
    let evalQuery = admin
      .from("evaluations")
      .select("id, max_score")
      .eq("class_id", classId)
      .eq("subject_id", subjectId);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);
    const { data: evalRows } = await evalQuery;

    const maxByEval = new Map<string, number>();
    for (const e of (evalRows as Array<{ id: unknown; max_score: unknown }>) ?? []) {
      maxByEval.set(String(e.id), Number(e.max_score ?? 20) || 20);
    }
    const evalIds = Array.from(maxByEval.keys());
    if (evalIds.length === 0) {
      return NextResponse.json({ averages: [], classAverage: null });
    }

    const { data: gradeRows } = await admin
      .from("grades")
      .select("student_id, score, evaluation_id")
      .in("evaluation_id", evalIds)
      .range(0, 20000);

    const acc = new Map<string, { sum: number; n: number }>();
    for (const g of (gradeRows as Array<{ student_id: unknown; score: unknown; evaluation_id: unknown }>) ?? []) {
      const max = maxByEval.get(String(g.evaluation_id)) ?? 20;
      const s20 = (Number(g.score) / (max || 20)) * 20;
      const sid = String(g.student_id);
      const cur = acc.get(sid) ?? { sum: 0, n: 0 };
      cur.sum += s20;
      cur.n += 1;
      acc.set(sid, cur);
    }

    const averages = Array.from(acc.entries()).map(([studentId, v]) => ({
      studentId,
      average: Math.round((v.sum / Math.max(1, v.n)) * 10) / 10,
      count: v.n,
    }));
    const classAverage = averages.length
      ? Math.round((averages.reduce((s, a) => s + a.average, 0) / averages.length) * 10) / 10
      : null;

    return NextResponse.json({ averages, classAverage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
