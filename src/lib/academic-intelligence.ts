import { type AcademicMetric } from "@/lib/types";

export function computeAcademicMetric(input: {
  studentId: string;
  averageScore: number;
  attendanceRate: number;
  previousAverageScore?: number;
}): AcademicMetric {
  const { studentId, averageScore, attendanceRate, previousAverageScore = averageScore } = input;

  const performanceTrend =
    averageScore > previousAverageScore
      ? "IMPROVING"
      : averageScore < previousAverageScore
        ? "DECLINING"
        : "STABLE";

  const absenceRate = 100 - attendanceRate;
  const highRisk = averageScore < 10 && absenceRate > 20;
  const mediumRisk = averageScore < 12 || absenceRate > 12;

  const riskLevel = highRisk ? "HIGH" : mediumRisk ? "MEDIUM" : "LOW";

  return {
    studentId,
    averageScore,
    attendanceRate,
    performanceTrend,
    riskLevel,
    alertFlag: riskLevel === "HIGH",
  };
}
