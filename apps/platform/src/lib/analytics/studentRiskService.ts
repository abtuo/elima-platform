import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import type { RiskLevel } from "@/lib/types";
import { classifyStudentRisk, type StudentMetricInput, type StudentRiskResult } from "@/lib/analytics/rules";

export {
  classifyStudentRisk,
  detectDecliningStudents,
  detectHighAbsence,
} from "@/lib/analytics/rules";
export type { StudentMetricInput, StudentRiskResult } from "@/lib/analytics/rules";

/** Load latest academic_metrics for a school and classify each student. */
export async function getStudentRiskBoard(schoolId: string): Promise<StudentRiskResult[]> {
  if (!schoolId) return [];
  const admin = await createSupabaseAdminServerClient();
  const { data, error } = await admin
    .from("academic_metrics")
    .select("student_id, average_score, attendance_rate, performance_trend, computed_at")
    .eq("school_id", schoolId)
    .order("computed_at", { ascending: false });
  if (error) return [];

  const latest = new Map<string, StudentMetricInput>();
  for (const m of data ?? []) {
    const sid = String((m as { student_id: string }).student_id);
    if (latest.has(sid)) continue;
    latest.set(sid, {
      studentId: sid,
      averageScore: Number((m as { average_score: number }).average_score),
      attendanceRate: Number((m as { attendance_rate: number }).attendance_rate),
      performanceTrend: String((m as { performance_trend: string }).performance_trend),
    });
  }

  return Array.from(latest.values())
    .map(classifyStudentRisk)
    .filter((r) => r.level !== "LOW")
    .sort((a, b) => {
      const order: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.level] - order[b.level] || a.averageScore - b.averageScore;
    });
}
