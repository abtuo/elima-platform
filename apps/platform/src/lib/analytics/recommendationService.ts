import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import type { AnalyticsAlert } from "@/lib/types";
import { getStudentRiskBoard } from "@/lib/analytics/studentRiskService";
import { getClassPerformance } from "@/lib/analytics/academicAnalyticsService";
import { buildRecommendations, type EnrichedRisk } from "@/lib/analytics/rules";
import { getAllUnpaidStudents } from "@/lib/finance/queries";

export { buildRecommendations } from "@/lib/analytics/rules";
export type { EnrichedRisk } from "@/lib/analytics/rules";

/** Full pipeline: risk + finance + class performance -> recommendations. */
export async function getRecommendations(schoolId: string): Promise<AnalyticsAlert[]> {
  if (!schoolId) return [];
  const admin = await createSupabaseAdminServerClient();

  const [riskBoard, unpaid, weakClasses] = await Promise.all([
    getStudentRiskBoard(schoolId),
    getAllUnpaidStudents(schoolId),
    getClassPerformance(schoolId),
  ]);

  const debtIds = new Set(unpaid.map((u) => u.studentId));

  // Enrich the top risks with student identity.
  const topRisks = riskBoard.slice(0, 20);
  const ids = topRisks.map((r) => r.studentId);
  const nameById = new Map<string, { fullName: string; className: string }>();
  if (ids.length > 0) {
    const { data: students } = await admin
      .from("students")
      .select("id, full_name, class:classes!students_class_id_fkey(name)")
      .eq("school_id", schoolId)
      .in("id", ids);
    for (const s of (students ?? []) as Array<{ id: string; full_name: string; class: Array<{ name: string }> | null }>) {
      nameById.set(String(s.id), {
        fullName: String(s.full_name),
        className: String(s.class?.[0]?.name ?? ""),
      });
    }
  }

  const risks: EnrichedRisk[] = topRisks.map((r) => ({
    ...r,
    fullName: nameById.get(r.studentId)?.fullName ?? "Élève",
    className: nameById.get(r.studentId)?.className ?? "",
    hasDebt: debtIds.has(r.studentId),
  }));

  return buildRecommendations({ risks, weakClasses });
}
