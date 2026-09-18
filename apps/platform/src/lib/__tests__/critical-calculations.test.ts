import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyStudentRisk,
  detectDecliningStudents,
  detectHighAbsence,
  classifyCollection,
  computeClassPerformance,
  buildRecommendations,
  type GradePoint,
  type EnrichedRisk,
} from "../analytics/rules";
import { classifyBalance } from "../finance/rules";
import { computeAcademicMetric } from "../academic-intelligence";

test("classifyStudentRisk: low average + high absence => HIGH", () => {
  const r = classifyStudentRisk({ studentId: "s1", averageScore: 7, attendanceRate: 60, performanceTrend: "DECLINING" });
  assert.equal(r.level, "HIGH");
  assert.ok(r.reasons.includes("Moyenne très faible"));
  assert.ok(r.reasons.includes("Absentéisme élevé"));
  assert.equal(r.declining, true);
});

test("classifyStudentRisk: good student => LOW", () => {
  const r = classifyStudentRisk({ studentId: "s2", averageScore: 15, attendanceRate: 98, performanceTrend: "IMPROVING" });
  assert.equal(r.level, "LOW");
  assert.equal(r.reasons.length, 0);
});

test("classifyStudentRisk: declining mid student => MEDIUM", () => {
  const r = classifyStudentRisk({ studentId: "s3", averageScore: 13, attendanceRate: 95, performanceTrend: "DECLINING" });
  assert.equal(r.level, "MEDIUM");
});

test("detectDecliningStudents filters DECLINING trend", () => {
  const list = detectDecliningStudents([
    { studentId: "a", averageScore: 10, attendanceRate: 90, performanceTrend: "DECLINING" },
    { studentId: "b", averageScore: 10, attendanceRate: 90, performanceTrend: "STABLE" },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].studentId, "a");
});

test("detectHighAbsence uses presence threshold", () => {
  const list = detectHighAbsence(
    [
      { studentId: "a", averageScore: 10, attendanceRate: 70, performanceTrend: "STABLE" },
      { studentId: "b", averageScore: 10, attendanceRate: 95, performanceTrend: "STABLE" },
    ],
    80,
  );
  assert.deepEqual(list.map((m) => m.studentId), ["a"]);
});

test("classifyCollection thresholds", () => {
  assert.equal(classifyCollection(90), "low");
  assert.equal(classifyCollection(70), "medium");
  assert.equal(classifyCollection(40), "high");
});

test("computeClassPerformance normalizes to /20 and respects minGrades", () => {
  const grades: GradePoint[] = [
    { classId: "c1", score: 10, maxScore: 20, studentId: "s1" },
    { classId: "c1", score: 20, maxScore: 20, studentId: "s2" },
    { classId: "c1", score: 15, maxScore: 20, studentId: "s3" },
    // c2 has only 1 grade -> excluded by minGrades=3
    { classId: "c2", score: 5, maxScore: 10, studentId: "s4" },
  ];
  const names = new Map([
    ["c1", "6e A"],
    ["c2", "5e B"],
  ]);
  const perf = computeClassPerformance(grades, names, 3);
  assert.equal(perf.length, 1);
  assert.equal(perf[0].classId, "c1");
  assert.equal(perf[0].average, 15); // (10+20+15)/3
  assert.equal(perf[0].studentCount, 3);
});

test("computeClassPerformance handles non-20 max scores", () => {
  const grades: GradePoint[] = [
    { classId: "c1", score: 5, maxScore: 10, studentId: "s1" },
    { classId: "c1", score: 8, maxScore: 10, studentId: "s2" },
    { classId: "c1", score: 10, maxScore: 10, studentId: "s3" },
  ];
  const perf = computeClassPerformance(grades, new Map([["c1", "C1"]]), 3);
  // (10 + 16 + 20) / 3 = 15.33
  assert.equal(perf[0].average, 15.33);
});

test("classifyBalance: paid / partial / unpaid", () => {
  assert.deepEqual(classifyBalance(1000, 1000), { remaining: 0, status: "paid" });
  assert.deepEqual(classifyBalance(1000, 400), { remaining: 600, status: "partial" });
  assert.deepEqual(classifyBalance(1000, 0), { remaining: 1000, status: "unpaid" });
  assert.deepEqual(classifyBalance(0, 0), { remaining: 0, status: "paid" });
});

test("computeAcademicMetric: high risk when low average and high absence", () => {
  const m = computeAcademicMetric({ studentId: "s1", averageScore: 8, attendanceRate: 70, previousAverageScore: 10 });
  assert.equal(m.riskLevel, "HIGH");
  assert.equal(m.performanceTrend, "DECLINING");
  assert.equal(m.alertFlag, true);
});

test("buildRecommendations: combines academic + financial risk", () => {
  const risks: EnrichedRisk[] = [
    {
      studentId: "s1",
      level: "HIGH",
      reasons: ["Moyenne très faible"],
      averageScore: 7,
      attendanceRate: 90,
      declining: false,
      fullName: "Awa Diop",
      className: "6e A",
      hasDebt: true,
    },
  ];
  const alerts = buildRecommendations({ risks, weakClasses: [] });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "ACADEMIC_AND_FINANCIAL");
  assert.equal(alerts[0].severity, "HIGH");
});

test("buildRecommendations: flags weak classes", () => {
  const alerts = buildRecommendations({
    risks: [],
    weakClasses: [{ classId: "c1", className: "5e B", average: 8.5, studentCount: 20 }],
  });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "CLASS_ATTENTION");
  assert.equal(alerts[0].severity, "HIGH");
});
