import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Class ranking (palmarès) for a given class + term.
 * Ranks every student by their overall weighted term average
 * (per-subject average weighted by subject coefficient), same method as bulletins.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const term = url.searchParams.get("term"); // "Trimestre 1" | ...

    if (!classId) {
      return NextResponse.json({ ranking: [], classAverage: null });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { data: userRow } = await admin
      .from("users")
      .select("school_id, role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow?.school_id || userRow.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    }
    const schoolId = String(userRow.school_id);

    // Resolve term id from its label (optional).
    let termId: string | null = null;
    if (term) {
      const { data: termRow } = await admin
        .from("terms")
        .select("id")
        .eq("school_id", schoolId)
        .ilike("name", term)
        .maybeSingle();
      termId = (termRow as { id?: string } | null)?.id ?? null;
    }

    // Students in the class.
    const { data: studentRows } = await admin
      .from("students")
      .select("id, full_name")
      .eq("class_id", classId);
    const students = (studentRows as Array<{ id: string; full_name: string }>) ?? [];
    const nameById = new Map(students.map((s) => [String(s.id), String(s.full_name)]));

    // Evaluations for this class (+ term), with subject + coefficient.
    let evalQuery = admin
      .from("evaluations")
      .select("id, max_score, subject_id, subject:subjects!evaluations_subject_id_fkey(name, coefficient)")
      .eq("class_id", classId);
    if (termId) evalQuery = evalQuery.eq("term_id", termId);
    const { data: evalRows } = await evalQuery;

    type EvalInfo = { max: number; subject: string; coeff: number };
    const evalById = new Map<string, EvalInfo>();
    for (const e of (evalRows as Array<{
      id: unknown;
      max_score: unknown;
      subject?: Array<{ name?: unknown; coefficient?: unknown }> | null;
    }>) ?? []) {
      const subj = e.subject?.[0];
      evalById.set(String(e.id), {
        max: Number(e.max_score ?? 20) || 20,
        subject: String(subj?.name ?? "—"),
        coeff: Number(subj?.coefficient ?? 1) || 1,
      });
    }
    const evalIds = Array.from(evalById.keys());

    // Per-student scores grouped by subject.
    const byStudentSubject = new Map<string, Map<string, number[]>>();
    if (evalIds.length > 0) {
      const { data: gradeRows } = await admin
        .from("grades")
        .select("student_id, score, evaluation_id")
        .in("evaluation_id", evalIds)
        .range(0, 50000);
      for (const g of (gradeRows as Array<{ student_id: unknown; score: unknown; evaluation_id: unknown }>) ?? []) {
        const info = evalById.get(String(g.evaluation_id));
        if (!info) continue;
        const s20 = (Number(g.score) / (info.max || 20)) * 20;
        const sid = String(g.student_id);
        const bySubj = byStudentSubject.get(sid) ?? new Map<string, number[]>();
        const arr = bySubj.get(info.subject) ?? [];
        arr.push(s20);
        bySubj.set(info.subject, arr);
        byStudentSubject.set(sid, bySubj);
      }
    }

    const subjectCoeff = new Map<string, number>();
    for (const info of evalById.values()) {
      if (!subjectCoeff.has(info.subject)) subjectCoeff.set(info.subject, info.coeff);
    }

    // Attendance over the last 30 days (present rate per student) for the class.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);
    const { data: attRows } = await admin
      .from("attendance")
      .select("student_id, status, date")
      .eq("class_id", classId)
      .gte("date", sinceStr)
      .range(0, 50000);
    const att = new Map<string, { present: number; total: number }>();
    for (const a of (attRows as Array<{ student_id: unknown; status: unknown }>) ?? []) {
      const sid = String(a.student_id);
      const cur = att.get(sid) ?? { present: 0, total: 0 };
      cur.total += 1;
      if (String(a.status) === "PRESENT") cur.present += 1;
      att.set(sid, cur);
    }

    const ranking = students
      .map((s) => {
        const bySubj = byStudentSubject.get(String(s.id));
        let cs = 0;
        let ws = 0;
        if (bySubj) {
          for (const [subject, scores] of bySubj) {
            if (!scores.length) continue;
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const coeff = subjectCoeff.get(subject) ?? 1;
            cs += coeff;
            ws += avg * coeff;
          }
        }
        const average = cs ? Math.round((ws / cs) * 100) / 100 : null;
        const a = att.get(String(s.id));
        const attendanceRate = a && a.total ? Math.round((a.present / a.total) * 100) : null;
        return { studentId: String(s.id), fullName: nameById.get(String(s.id)) ?? "—", average, attendanceRate };
      })
      // Students without grades are pushed to the bottom but still listed.
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
      .map((row) => ({ ...row, rank: 0 }));

    // Assign ranks; tied averages share the same rank.
    let lastAvg: number | null = Number.POSITIVE_INFINITY;
    let lastRank = 0;
    ranking.forEach((row, idx) => {
      if (row.average !== lastAvg) {
        lastRank = idx + 1;
        lastAvg = row.average;
      }
      row.rank = lastRank;
    });

    const graded = ranking.filter((r) => r.average != null);
    const classAverage = graded.length
      ? Math.round((graded.reduce((s, r) => s + (r.average as number), 0) / graded.length) * 100) / 100
      : null;

    return NextResponse.json({ ranking, classAverage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
