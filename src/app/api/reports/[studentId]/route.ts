import { NextResponse } from "next/server";
import { demoMetrics, demoReportRows, demoSchool, demoStudents } from "@/lib/demo-data";
import { buildStudentReportPdf } from "@/lib/report-pdf";
import { logEvent } from "@/lib/logger";
import { computeAcademicMetric } from "@/lib/academic-intelligence";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

function slugSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const admin = await createSupabaseAdminServerClient();

  let student = demoStudents.find((s) => s.id === studentId) ?? demoStudents[0];
  let metric = demoMetrics.find((m) => m.studentId === student.id) ?? demoMetrics[0];
  let rows = demoReportRows[student.id] ?? demoReportRows["stu-001"];
  let school = demoSchool;
  let classSize = 32;
  let section = "Générale";
  let termLabel = "Trimestre 1";
  let academicYear = "2025-2026";
  let termAverage: number | null = student.average;
  let annualAverage: number | null = null;

  try {
    const { data: studentRow } = await admin
      .from("students")
      .select(`
        id, full_name, school_id, class_id,
        class:classes!students_class_id_fkey(id, name, level, academic_year),
        school:schools!students_school_id_fkey(name, city, country, phone)
      `)
      .eq("id", studentId)
      .maybeSingle();

    if (studentRow) {
      const classRow = (studentRow as { class?: Array<{ id: string; name: string; level: string; academic_year: string }> | null }).class?.[0];
      const schoolRow = (studentRow as { school?: Array<{ name?: string; city?: string; country?: string; phone?: string }> | null }).school?.[0];
      const schoolId = String((studentRow as { school_id: string }).school_id);
      const classId = String((studentRow as { class_id: string }).class_id);

      if (classRow?.academic_year) academicYear = String(classRow.academic_year);
      classSize = Number(
        (await admin.from("students").select("id", { count: "exact", head: true }).eq("class_id", classId)).count ?? 0,
      );
      section = classRow?.level ? String(classRow.level) : section;

      if (schoolRow) {
        school = {
          name: String(schoolRow.name ?? demoSchool.name),
          city: schoolRow.city ? String(schoolRow.city) : undefined,
          country: schoolRow.country ? String(schoolRow.country) : undefined,
          phone: schoolRow.phone ? String(schoolRow.phone) : undefined,
          email: demoSchool.email,
          site: demoSchool.site,
          address: demoSchool.address,
        };
      }

      // Resolve current term (if configured), fallback to latest created term.
      const { data: schoolTerm } = await admin.from("schools").select("current_term_id").eq("id", schoolId).maybeSingle();
      let currentTermId = (schoolTerm as { current_term_id?: string | null } | null)?.current_term_id ?? null;
      if (!currentTermId) {
        const { data: termsFallback } = await admin
          .from("terms")
          .select("id, name")
          .eq("school_id", schoolId)
          .order("start_date", { ascending: false })
          .limit(1);
        currentTermId = termsFallback?.[0]?.id ?? null;
        if (termsFallback?.[0]?.name) termLabel = String(termsFallback[0].name);
      } else {
        const { data: currentTerm } = await admin.from("terms").select("name").eq("id", currentTermId).maybeSingle();
        if (currentTerm?.name) termLabel = String(currentTerm.name);
      }

      const { data: attendanceRows } = await admin
        .from("attendance")
        .select("status")
        .eq("student_id", studentId)
        .eq("class_id", classId);
      const totalAttendance = attendanceRows?.length ?? 0;
      const presentAttendance = (attendanceRows ?? []).filter((a) => a.status === "PRESENT").length;
      const attendanceRate = totalAttendance ? Math.round((presentAttendance / totalAttendance) * 100) : student.attendanceRate;

      const { data: gradesRows } = await admin
        .from("grades")
        .select(`
          student_id, score,
          evaluation:evaluations!grades_evaluation_id_fkey(
            id, class_id, term_id, max_score, coefficient,
            subject:subjects!evaluations_subject_id_fkey(name, coefficient)
          )
        `)
        .eq("school_id", schoolId);

      type GradeWithEval = {
        student_id: string;
        score: number;
        evaluation: {
          id: string;
          class_id: string;
          term_id: string | null;
          max_score: number;
          coefficient: number;
          subject: { name: string; coefficient: number } | null;
        } | null;
      };

      const normalizedGrades: GradeWithEval[] = ((gradesRows as unknown as Array<{
        student_id: unknown;
        score: unknown;
        evaluation: Array<{
          id: unknown;
          class_id: unknown;
          term_id: unknown;
          max_score: unknown;
          coefficient: unknown;
          subject: Array<{ name: unknown; coefficient: unknown }> | null;
        }> | null;
      }>) ?? []).map((row) => {
        const evaluation = row.evaluation?.[0];
        const subject = evaluation?.subject?.[0];
        return {
          student_id: String(row.student_id),
          score: Number(row.score),
          evaluation: evaluation
            ? {
                id: String(evaluation.id),
                class_id: String(evaluation.class_id),
                term_id: evaluation.term_id ? String(evaluation.term_id) : null,
                max_score: Number(evaluation.max_score ?? 20),
                coefficient: Number(evaluation.coefficient ?? 1),
                subject: subject
                  ? {
                      name: String(subject.name),
                      coefficient: Number(subject.coefficient ?? 1),
                    }
                  : null,
              }
            : null,
        };
      });

      const classGrades = normalizedGrades.filter(
        (g) => g.evaluation && String(g.evaluation.class_id) === classId,
      );
      const currentTermGrades = currentTermId
        ? classGrades.filter((g) => String(g.evaluation?.term_id ?? "") === String(currentTermId))
        : classGrades;

      const bySubject = new Map<string, GradeWithEval[]>();
      currentTermGrades.forEach((grade) => {
        const subjectName = grade.evaluation?.subject?.name ?? "Matière";
        const bucket = bySubject.get(subjectName) ?? [];
        bucket.push(grade);
        bySubject.set(subjectName, bucket);
      });

      rows = Array.from(bySubject.entries()).map(([subjectName, subjectGrades]) => {
        const studentSubjectGrades = subjectGrades.filter((g) => String(g.student_id) === studentId);
        const allSubjectScores = subjectGrades.map((g) => {
          const max = Number(g.evaluation?.max_score ?? 20) || 20;
          return (Number(g.score) / max) * 20;
        });
        const studentScores = studentSubjectGrades.map((g) => {
          const max = Number(g.evaluation?.max_score ?? 20) || 20;
          return (Number(g.score) / max) * 20;
        });
        const classAvg = allSubjectScores.length ? allSubjectScores.reduce((a, b) => a + b, 0) / allSubjectScores.length : undefined;
        const studentAvg = studentScores.length ? studentScores.reduce((a, b) => a + b, 0) / studentScores.length : undefined;

        const appreciation =
          studentAvg == null
            ? "Pas de note ce trimestre."
            : studentAvg >= 16
              ? "Excellent trimestre."
              : studentAvg >= 14
                ? "Tres bon trimestre."
                : studentAvg >= 12
                  ? "Bon trimestre."
                  : studentAvg >= 10
                    ? "Peut mieux faire."
                    : "Resultats insuffisants.";

        return {
          subject: subjectName,
          coefficient: Number(subjectGrades[0]?.evaluation?.subject?.coefficient ?? 1),
          score: studentAvg,
          classMin: allSubjectScores.length ? Math.min(...allSubjectScores) : undefined,
          classMax: allSubjectScores.length ? Math.max(...allSubjectScores) : undefined,
          classAvg,
          termScores: { [termLabel]: studentAvg },
          yearScore: undefined,
          appreciation,
        };
      });

      if (rows.length > 0) {
        const weighted = rows
          .filter((r) => typeof r.score === "number")
          .map((r) => ({ score: Number(r.score), coeff: Number(r.coefficient ?? 1) }));
        const coeffSum = weighted.reduce((sum, r) => sum + r.coeff, 0);
        const weightedSum = weighted.reduce((sum, r) => sum + r.score * r.coeff, 0);
        termAverage = coeffSum ? weightedSum / coeffSum : null;
      }

      const studentAllTerms = classGrades.filter((g) => String(g.student_id) === studentId);
      const termAverages = new Map<string, { sum: number; coeff: number }>();
      studentAllTerms.forEach((g) => {
        const termKey = String(g.evaluation?.term_id ?? "");
        if (!termKey) return;
        const current = termAverages.get(termKey) ?? { sum: 0, coeff: 0 };
        const evalCoeff = Number(g.evaluation?.coefficient ?? 1);
        const score20 = (Number(g.score) / (Number(g.evaluation?.max_score ?? 20) || 20)) * 20;
        current.sum += score20 * evalCoeff;
        current.coeff += evalCoeff;
        termAverages.set(termKey, current);
      });
      const computedTermAverages = Array.from(termAverages.values())
        .filter((t) => t.coeff > 0)
        .map((t) => t.sum / t.coeff);
      annualAverage = computedTermAverages.length >= 3
        ? computedTermAverages.reduce((a, b) => a + b, 0) / computedTermAverages.length
        : null;

      student = {
        id: String((studentRow as { id: string }).id),
        fullName: String((studentRow as { full_name: string }).full_name),
        className: String(classRow?.name ?? student.className),
        average: Number(termAverage ?? student.average),
        attendanceRate,
      };
      metric = computeAcademicMetric({
        studentId: student.id,
        averageScore: student.average,
        attendanceRate: student.attendanceRate,
        previousAverageScore: student.average - 0.4,
      });
    }
  } catch {
    // If anything fails, keep demo fallback to avoid blocking bulletin generation.
  }

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoPngBytes = new Uint8Array(await readFile(logoPath));
  const stampPath = path.join(process.cwd(), "public", "tampon.jpg");
  const stampJpgBytes = new Uint8Array(await readFile(stampPath));

  const pdfBytes = await buildStudentReportPdf({
    school,
    student,
    metric,
    term: termLabel,
    academicYear,
    rows,
    schoolStats: {
      classSize,
      section,
      termAverage,
      annualAverage,
    },
    logoPngBytes,
    stampJpgBytes,
  });

  logEvent("INFO", "REPORT_PDF_GENERATED", {
    studentId: student.id,
    riskLevel: metric.riskLevel,
  });

  // NextResponse expects a `BodyInit`.
  // With TS' newer typed-array generics, `Uint8Array<ArrayBufferLike>` may be seen
  // as potentially backed by a `SharedArrayBuffer`, which then fails `BodyInit`
  // and `BlobPart` type checks.
  //
  // We force a copy into a fresh `Uint8Array` backed by a regular `ArrayBuffer`.
  const safePdfBytes = new Uint8Array(pdfBytes);
  const pdfBlob = new Blob([safePdfBytes], { type: "application/pdf" });

  try {
    const { data: studentRow } = await admin
      .from("students")
      .select(`
        id, full_name, school_id,
        class:classes!students_class_id_fkey(name, level)
      `)
      .eq("id", student.id)
      .maybeSingle();

    const classRow = (studentRow as { class?: Array<{ name?: string; level?: string }> | null })?.class?.[0];
    const schoolSegment = slugSegment(String((studentRow as { school_id?: string | null })?.school_id ?? "ecole"), "ecole");
    const levelSegment = slugSegment(String(classRow?.level ?? "niveau"), "niveau");
    const classSegment = slugSegment(String(classRow?.name ?? "classe"), "classe");
    const studentSegment = slugSegment(String((studentRow as { full_name?: string | null })?.full_name ?? student.id), "eleve");
    const bulletinPath =
      `bulletins/${schoolSegment}/${levelSegment}/${classSegment}/${studentSegment}/` +
      `${Date.now()}-bulletin-${student.id}.pdf`;

    await admin.storage.from("elima-files").upload(bulletinPath, safePdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  } catch {
    // Storage upload is best-effort. PDF response should still be returned.
  }

  return new NextResponse(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bulletin-${student.id}.pdf"`,
    },
  });
}
