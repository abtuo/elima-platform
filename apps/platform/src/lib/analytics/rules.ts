// Pure analytics rules — no runtime/server imports, safe to unit-test.
import type { AnalyticsAlert, RiskLevel } from "@/lib/types";

export type StudentMetricInput = {
  studentId: string;
  averageScore: number;
  attendanceRate: number;
  performanceTrend: string;
};

export type StudentRiskResult = {
  studentId: string;
  level: RiskLevel;
  reasons: string[];
  averageScore: number;
  attendanceRate: number;
  declining: boolean;
};

export type ClassPerformance = {
  classId: string;
  className: string;
  average: number;
  studentCount: number;
};

export type GradePoint = { classId: string; score: number; maxScore: number; studentId: string };

export type EnrichedRisk = StudentRiskResult & { fullName: string; className: string; hasDebt: boolean };

/** Classify a single student's risk from academic indicators. */
export function classifyStudentRisk(input: StudentMetricInput): StudentRiskResult {
  const reasons: string[] = [];
  const declining = String(input.performanceTrend).toUpperCase() === "DECLINING";

  if (input.averageScore < 8) reasons.push("Moyenne très faible");
  else if (input.averageScore < 10) reasons.push("Moyenne faible");

  const absenceRate = 100 - input.attendanceRate;
  if (absenceRate > 25) reasons.push("Absentéisme élevé");
  else if (absenceRate > 15) reasons.push("Absences à surveiller");

  if (declining) reasons.push("Notes en baisse");

  let level: RiskLevel = "LOW";
  if (input.averageScore < 8 || absenceRate > 25) level = "HIGH";
  else if (input.averageScore < 11 || absenceRate > 15 || declining) level = "MEDIUM";

  return {
    studentId: input.studentId,
    level,
    reasons,
    averageScore: input.averageScore,
    attendanceRate: input.attendanceRate,
    declining,
  };
}

/** Students whose average is dropping. */
export function detectDecliningStudents(metrics: StudentMetricInput[]): StudentMetricInput[] {
  return metrics.filter((m) => String(m.performanceTrend).toUpperCase() === "DECLINING");
}

/** Students with too many absences (default threshold 80% presence). */
export function detectHighAbsence(metrics: StudentMetricInput[], minPresenceRate = 80): StudentMetricInput[] {
  return metrics.filter((m) => m.attendanceRate < minPresenceRate);
}

/** Severity of the collection situation for a school. */
export function classifyCollection(collectionRate: number): "low" | "medium" | "high" {
  if (collectionRate >= 85) return "low";
  if (collectionRate >= 60) return "medium";
  return "high";
}

/** Aggregate per-class averages (normalized to /20) from grade points. */
export function computeClassPerformance(
  grades: GradePoint[],
  classNames: Map<string, string>,
  minGrades = 3,
): ClassPerformance[] {
  const agg = new Map<string, { sum: number; n: number; students: Set<string> }>();
  for (const g of grades) {
    const norm = (g.score / (g.maxScore || 20)) * 20;
    const cur = agg.get(g.classId) ?? { sum: 0, n: 0, students: new Set<string>() };
    cur.sum += norm;
    cur.n += 1;
    cur.students.add(g.studentId);
    agg.set(g.classId, cur);
  }
  return Array.from(agg.entries())
    .filter(([, v]) => v.n >= minGrades)
    .map(([classId, v]) => ({
      classId,
      className: classNames.get(classId) ?? "Classe",
      average: Math.round((v.sum / v.n) * 100) / 100,
      studentCount: v.students.size,
    }))
    .sort((a, b) => b.average - a.average);
}

/** Build actionable recommendations from enriched risk data + class performance. */
export function buildRecommendations(input: {
  risks: EnrichedRisk[];
  weakClasses: ClassPerformance[];
}): AnalyticsAlert[] {
  const alerts: AnalyticsAlert[] = [];

  for (const r of input.risks) {
    if (r.level === "HIGH" && r.hasDebt) {
      alerts.push({
        id: `acadfin-${r.studentId}`,
        type: "ACADEMIC_AND_FINANCIAL",
        severity: "HIGH",
        title: `${r.fullName} — résultats faibles et impayé`,
        description: `${r.className} · moyenne ${r.averageScore}/20. Cumul difficulté scolaire et frais impayés.`,
        studentId: r.studentId,
        studentName: r.fullName,
        className: r.className,
        recommendation: "Contacter le parent: accompagnement scolaire + situation financière.",
      });
    } else if (r.level === "HIGH") {
      alerts.push({
        id: `acad-${r.studentId}`,
        type: r.reasons.includes("Absentéisme élevé") ? "HIGH_ABSENCE" : "ACADEMIC_DECLINE",
        severity: "HIGH",
        title: `${r.fullName} — élève à suivre`,
        description: `${r.className} · ${r.reasons.join(", ") || "Indicateurs préoccupants"}.`,
        studentId: r.studentId,
        studentName: r.fullName,
        className: r.className,
        recommendation: r.declining
          ? "Proposer un soutien sur les matières en baisse."
          : "Mettre en place un suivi rapproché.",
      });
    }
  }

  for (const c of input.weakClasses.slice(-2).reverse()) {
    if (c.average >= 11) continue;
    alerts.push({
      id: `class-${c.classId}`,
      type: "CLASS_ATTENTION",
      severity: c.average < 9 ? "HIGH" : "MEDIUM",
      title: `${c.className} — classe à renforcer`,
      description: `Moyenne de classe ${c.average}/20 sur la période récente.`,
      className: c.className,
      recommendation: "Réunir l'équipe pédagogique pour un plan de remédiation.",
    });
  }

  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 12);
}
