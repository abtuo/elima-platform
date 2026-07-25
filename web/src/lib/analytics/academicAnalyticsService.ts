import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { computeClassPerformance, type ClassPerformance, type GradePoint } from "@/lib/analytics/rules";

export { computeClassPerformance } from "@/lib/analytics/rules";
export type { ClassPerformance, GradePoint } from "@/lib/analytics/rules";

/** Class performance for a school over the recent evaluation window. */
export async function getClassPerformance(schoolId: string, days = 120): Promise<ClassPerformance[]> {
  if (!schoolId) return [];
  const admin = await createSupabaseAdminServerClient();

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  const [classesRes, evalsRes] = await Promise.all([
    admin.from("classes").select("id, name").eq("school_id", schoolId),
    admin.from("evaluations").select("id, class_id, max_score").eq("school_id", schoolId).gte("evaluation_date", fromStr),
  ]);

  const classNames = new Map(
    ((classesRes.data ?? []) as Array<{ id: string; name: string }>).map((c) => [String(c.id), String(c.name)]),
  );
  const evalMeta = new Map(
    ((evalsRes.data ?? []) as Array<{ id: string; class_id: string; max_score: number }>).map((e) => [
      String(e.id),
      { classId: String(e.class_id), maxScore: Number(e.max_score ?? 20) || 20 },
    ]),
  );
  const evalIds = Array.from(evalMeta.keys());
  if (evalIds.length === 0) return [];

  const { data: grades } = await admin
    .from("grades")
    .select("score, evaluation_id, student_id")
    .eq("school_id", schoolId)
    .in("evaluation_id", evalIds)
    .range(0, 50000);

  const points: GradePoint[] = ((grades ?? []) as Array<{ score: number; evaluation_id: string; student_id: string }>)
    .map((g) => {
      const meta = evalMeta.get(String(g.evaluation_id));
      if (!meta) return null;
      return { classId: meta.classId, score: Number(g.score), maxScore: meta.maxScore, studentId: String(g.student_id) };
    })
    .filter((p): p is GradePoint => p !== null);

  return computeClassPerformance(points, classNames);
}
