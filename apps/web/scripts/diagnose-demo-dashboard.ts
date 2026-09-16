import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DEMO_SCHOOLS } from "./demo-config";

dotenvConfig({ path: path.join(process.cwd(), ".env") });
dotenvConfig({ path: path.join(process.cwd(), ".env.local"), override: true });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function countBySchool(table: string, schoolId: string) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  return error ? `ERR: ${error.message}` : (count ?? 0);
}

async function main() {
  for (const school of DEMO_SCHOOLS) {
    const counts: Record<string, number | string> = {};
    for (const table of ["classes", "students", "teachers", "evaluations", "grades", "attendance", "academic_metrics"]) {
      counts[table] = await countBySchool(table, school.id);
    }

    const { data: currentEvals } = await admin
      .from("evaluations")
      .select("id, class_id, evaluation_date")
      .eq("school_id", school.id)
      .gte("evaluation_date", "2025-09-01")
      .lte("evaluation_date", "2026-06-25")
      .limit(5);

    const { count: currentEvalCount } = await admin
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school.id)
      .gte("evaluation_date", "2025-09-01")
      .lte("evaluation_date", "2026-06-25");

  const { count: riskCount } = await admin
    .from("academic_metrics")
    .select("id", { count: "exact", head: true })
    .eq("school_id", school.id)
    .in("risk_level", ["HIGH", "MEDIUM"]);

    const { data: classes } = await admin.from("classes").select("id, name, level").eq("school_id", school.id);
    const classRows = (classes ?? []) as Array<{ id: string; level: string | null; name?: string | null }>;
    const levelByClass = new Map(classRows.map((cls) => [cls.id, cls.level ?? "Niveau"]));
    const nameByClass = new Map(classRows.map((cls) => [cls.id, cls.name ?? cls.level ?? "Classe"]));
    const currentEvalIds = (await admin
      .from("evaluations")
      .select("id, class_id, evaluation_date")
      .eq("school_id", school.id)
      .gte("evaluation_date", "2025-09-01")
      .lte("evaluation_date", "2026-06-25")
      .range(0, 1000)).data as Array<{ id: string; class_id: string; evaluation_date: string }> | null;
    const evalClass = new Map((currentEvalIds ?? []).map((evaluation) => [evaluation.id, evaluation.class_id]));
    const evalMonth = new Map((currentEvalIds ?? []).map((evaluation) => [evaluation.id, evaluation.evaluation_date.slice(0, 7)]));
    const levelHits = new Map<string, number>();
    const levelMonthAgg = new Map<string, Map<string, { sum: number; n: number }>>();
    const classAgg = new Map<string, { sum: number; n: number }>();
    const studentTerm3Agg = new Map<string, { classId: string; sum: number; n: number }>();
    for (let i = 0; i < (currentEvalIds?.length ?? 0); i += 40) {
      const chunk = (currentEvalIds ?? []).slice(i, i + 40).map((evaluation) => evaluation.id);
      const { data: grades } = await admin
        .from("grades")
        .select("evaluation_id, student_id, score")
        .eq("school_id", school.id)
        .in("evaluation_id", chunk)
        .range(0, 50000);
      for (const grade of (grades ?? []) as Array<{ evaluation_id: string; student_id: string; score: number }>) {
        const classId = evalClass.get(grade.evaluation_id);
        if (!classId) continue;
        const level = levelByClass.get(classId) ?? "Niveau";
        levelHits.set(level, (levelHits.get(level) ?? 0) + 1);
        const month = evalMonth.get(grade.evaluation_id) ?? "";
        const score = Number(grade.score);
        const monthAgg = levelMonthAgg.get(level) ?? new Map<string, { sum: number; n: number }>();
        const levelBucket = monthAgg.get(month) ?? { sum: 0, n: 0 };
        levelBucket.sum += score;
        levelBucket.n += 1;
        monthAgg.set(month, levelBucket);
        levelMonthAgg.set(level, monthAgg);

        const classBucket = classAgg.get(classId) ?? { sum: 0, n: 0 };
        classBucket.sum += score;
        classBucket.n += 1;
        classAgg.set(classId, classBucket);

        if (month >= "2026-04") {
          const key = `${classId}:${grade.student_id}`;
          const studentBucket = studentTerm3Agg.get(key) ?? { classId, sum: 0, n: 0 };
          studentBucket.sum += score;
          studentBucket.n += 1;
          studentTerm3Agg.set(key, studentBucket);
        }
      }
    }
    const compactSeries = Object.fromEntries(
      Array.from(levelMonthAgg.entries())
        .slice(0, 5)
        .map(([level, byMonth]) => [
          level,
          Array.from(byMonth.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, value]) => `${month}:${Math.round((value.sum / value.n) * 10) / 10}`),
        ]),
    );
    const classAverages = Array.from(classAgg.entries())
      .map(([classId, value]) => ({
        className: nameByClass.get(classId) ?? "Classe",
        average: Math.round((value.sum / value.n) * 10) / 10,
      }))
      .sort((a, b) => b.average - a.average);
    const topStudentAverages = Array.from(studentTerm3Agg.values())
      .map((value) => ({ className: nameByClass.get(value.classId) ?? "Classe", average: Math.round((value.sum / value.n) * 100) / 100 }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8);
    const { data: attendanceRows } = await admin
      .from("attendance")
      .select("status")
      .eq("school_id", school.id)
      .gte("date", "2026-06-15")
      .lte("date", "2026-06-25")
      .range(0, 50000);
    const attendanceCounts = ((attendanceRows ?? []) as Array<{ status: string }>).reduce(
      (acc, row) => {
        if (row.status === "PRESENT") acc.present += 1;
        else if (row.status === "ABSENT") acc.absent += 1;
        else if (row.status === "LATE") acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
    const attendanceTotal = attendanceCounts.present + attendanceCounts.absent + attendanceCounts.late;

    console.log(
      JSON.stringify(
        {
          school: school.name,
          counts,
          currentEvalCount,
          riskCount,
          cockpitLevelSeriesWouldRender: levelHits.size > 0,
          levelGradeHits: Object.fromEntries(levelHits),
          compactLevelSeries: compactSeries,
          topClassAverages: classAverages.slice(0, 5),
          watchClassAverages: classAverages.slice(-5),
          topStudentAveragesTerm3: topStudentAverages,
          attendanceRates: {
            present: attendanceTotal ? Math.round((attendanceCounts.present / attendanceTotal) * 1000) / 10 : 0,
            absent: attendanceTotal ? Math.round((attendanceCounts.absent / attendanceTotal) * 1000) / 10 : 0,
            late: attendanceTotal ? Math.round((attendanceCounts.late / attendanceTotal) * 1000) / 10 : 0,
          },
          sampleEvaluations: currentEvals ?? [],
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error("[diagnose:demo-dashboard] Fatal:", error);
  process.exit(1);
});
