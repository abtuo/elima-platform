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
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const requestedTerm = new URL(request.url).searchParams.get("term")?.trim() || null;
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
  let termProgression: { term: string; average: number }[] = [];
  let reportVariant: "term" | "final" = "term";
  let classRank: number | null = null;
  let rankTotal: number | null = null;
  let schoolLogoUrl: string | null = null;
  let schoolStampUrl: string | null = null;

  try {
    const { data: studentRow } = await admin
      .from("students")
      .select(`
        id, full_name, school_id, class_id,
        class:classes!students_class_id_fkey(id, name, level, academic_year),
        school:schools!students_school_id_fkey(name, city, country, phone, logo_url, stamp_url)
      `)
      .eq("id", studentId)
      .maybeSingle();

    if (studentRow) {
      const classRow = (studentRow as { class?: Array<{ id: string; name: string; level: string; academic_year: string }> | null }).class?.[0];
      const schoolRow = (studentRow as { school?: Array<{ name?: string; city?: string; country?: string; phone?: string; logo_url?: string | null; stamp_url?: string | null }> | null }).school?.[0];
      schoolLogoUrl = schoolRow?.logo_url ? String(schoolRow.logo_url) : null;
      schoolStampUrl = schoolRow?.stamp_url ? String(schoolRow.stamp_url) : null;
      const schoolId = String((studentRow as { school_id: string }).school_id);
      const classId = String((studentRow as { class_id: string }).class_id);

      if (classRow?.academic_year) academicYear = String(classRow.academic_year);
      classSize = Number(
        (await admin.from("students").select("id", { count: "exact", head: true }).eq("class_id", classId)).count ?? 0,
      );
      section = classRow?.level ? String(classRow.level) : section;

      if (schoolRow) {
        // Use only the real school fields stored in DB (no demo placeholders).
        school = {
          name: String(schoolRow.name ?? demoSchool.name),
          city: schoolRow.city ? String(schoolRow.city) : undefined,
          country: schoolRow.country ? String(schoolRow.country) : undefined,
          phone: schoolRow.phone ? String(schoolRow.phone) : undefined,
          email: undefined,
          site: undefined,
          address: undefined,
        };
      }

      // Resolve the term to render. Priority:
      //   1. ?term=<name> query param (e.g. "Trimestre 1") when provided,
      //   2. the school's configured current term,
      //   3. the latest created term as a fallback.
      let currentTermId: string | null = null;
      if (requestedTerm) {
        const { data: matchedTerm } = await admin
          .from("terms")
          .select("id, name")
          .eq("school_id", schoolId)
          .ilike("name", requestedTerm)
          .maybeSingle();
        if (matchedTerm?.id) {
          currentTermId = String(matchedTerm.id);
          if (matchedTerm.name) termLabel = String(matchedTerm.name);
        }
      }
      if (!currentTermId) {
        const { data: schoolTerm } = await admin.from("schools").select("current_term_id").eq("id", schoolId).maybeSingle();
        currentTermId = (schoolTerm as { current_term_id?: string | null } | null)?.current_term_id ?? null;
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
      }

      const { data: attendanceRows } = await admin
        .from("attendance")
        .select("status")
        .eq("student_id", studentId)
        .eq("class_id", classId);
      const totalAttendance = attendanceRows?.length ?? 0;
      const presentAttendance = (attendanceRows ?? []).filter((a) => a.status === "PRESENT").length;
      const attendanceRate = totalAttendance ? Math.round((presentAttendance / totalAttendance) * 100) : student.attendanceRate;

      // Evaluations for THIS class only (all terms), with subject + teacher.
      // Scoping by class keeps the dataset bounded (seeded schools have tens of
      // thousands of grades school-wide, well over Supabase's row caps).
      const { data: evalRowsRaw } = await admin
        .from("evaluations")
        .select(`
          id, term_id, max_score, coefficient,
          subject:subjects!evaluations_subject_id_fkey(name, coefficient),
          teacher:teachers!evaluations_teacher_id_fkey(
            user:users!teachers_user_id_fkey(full_name)
          )
        `)
        .eq("school_id", schoolId)
        .eq("class_id", classId);

      type EvalInfo = {
        termId: string | null;
        maxScore: number;
        coefficient: number;
        subjectName: string;
        subjectCoeff: number;
        teacherName: string | null;
      };
      const pickOne = <T>(v: T[] | T | null | undefined): T | null =>
        Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

      const evalById = new Map<string, EvalInfo>();
      for (const e of (evalRowsRaw as unknown as Array<{
        id: unknown;
        term_id: unknown;
        max_score: unknown;
        coefficient: unknown;
        subject: unknown;
        teacher: unknown;
      }>) ?? []) {
        const subj = pickOne(e.subject as Array<{ name: unknown; coefficient: unknown }> | null);
        const teacherWrap = pickOne(e.teacher as Array<{ user: unknown }> | null);
        const userWrap = teacherWrap ? pickOne(teacherWrap.user as Array<{ full_name: unknown }> | null) : null;
        evalById.set(String(e.id), {
          termId: e.term_id ? String(e.term_id) : null,
          maxScore: Number(e.max_score ?? 20) || 20,
          coefficient: Number(e.coefficient ?? 1),
          subjectName: subj ? String(subj.name) : "Matière",
          subjectCoeff: Number(subj?.coefficient ?? 1),
          teacherName: userWrap?.full_name ? String(userWrap.full_name) : null,
        });
      }

      const allEvalIds = Array.from(evalById.keys());
      const currentTermEvalIds = allEvalIds.filter(
        (id) => String(evalById.get(id)?.termId ?? "") === String(currentTermId ?? ""),
      );

      // Student grades across all class evaluations (term progression + year avg).
      const studentGradeRows = allEvalIds.length
        ? (
            await admin
              .from("grades")
              .select("score, evaluation_id")
              .eq("student_id", studentId)
              .in("evaluation_id", allEvalIds)
              .range(0, 5000)
          ).data ?? []
        : [];

      // Whole-class grades for the current term (class min/max/avg per subject + ranking).
      const classGradeRows = currentTermEvalIds.length
        ? (
            await admin
              .from("grades")
              .select("score, evaluation_id, student_id")
              .in("evaluation_id", currentTermEvalIds)
              .range(0, 50000)
          ).data ?? []
        : [];

      const toScore20 = (raw: number, evalId: string) => {
        const max = evalById.get(evalId)?.maxScore ?? 20;
        return (raw / (max || 20)) * 20;
      };

      // Class scores grouped by subject (current term), plus per-student scores
      // grouped by subject so we can rank every classmate for the term.
      const classBySubject = new Map<string, number[]>();
      const classStudentBySubject = new Map<string, Map<string, number[]>>();
      for (const g of classGradeRows as Array<{ score: unknown; evaluation_id: unknown; student_id: unknown }>) {
        const info = evalById.get(String(g.evaluation_id));
        if (!info) continue;
        const s20 = toScore20(Number(g.score), String(g.evaluation_id));
        const arr = classBySubject.get(info.subjectName) ?? [];
        arr.push(s20);
        classBySubject.set(info.subjectName, arr);

        const sid = String(g.student_id);
        const bySubj = classStudentBySubject.get(sid) ?? new Map<string, number[]>();
        const subjArr = bySubj.get(info.subjectName) ?? [];
        subjArr.push(s20);
        bySubj.set(info.subjectName, subjArr);
        classStudentBySubject.set(sid, bySubj);
      }

      // Student scores: current-term per subject + per-term weighted accumulation.
      const studentCurrentBySubject = new Map<string, number[]>();
      const studentByTerm = new Map<string, { sum: number; coeff: number }>();
      for (const g of studentGradeRows as Array<{ score: unknown; evaluation_id: unknown }>) {
        const info = evalById.get(String(g.evaluation_id));
        if (!info) continue;
        const s20 = toScore20(Number(g.score), String(g.evaluation_id));
        const termKey = String(info.termId ?? "");
        if (termKey) {
          const acc = studentByTerm.get(termKey) ?? { sum: 0, coeff: 0 };
          acc.sum += s20 * info.coefficient;
          acc.coeff += info.coefficient;
          studentByTerm.set(termKey, acc);
        }
        if (termKey === String(currentTermId ?? "")) {
          const arr = studentCurrentBySubject.get(info.subjectName) ?? [];
          arr.push(s20);
          studentCurrentBySubject.set(info.subjectName, arr);
        }
      }

      const subjectMeta = new Map<string, { coeff: number; teacher: string | null }>();
      for (const info of evalById.values()) {
        if (!subjectMeta.has(info.subjectName)) {
          subjectMeta.set(info.subjectName, { coeff: info.subjectCoeff, teacher: info.teacherName });
        }
      }

      const subjectNames = new Set<string>([
        ...studentCurrentBySubject.keys(),
        ...classBySubject.keys(),
      ]);

      rows = Array.from(subjectNames)
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((subjectName) => {
          const classScores = classBySubject.get(subjectName) ?? [];
          const studentScores = studentCurrentBySubject.get(subjectName) ?? [];
          const classAvg = classScores.length ? classScores.reduce((a, b) => a + b, 0) / classScores.length : undefined;
          const studentAvg = studentScores.length ? studentScores.reduce((a, b) => a + b, 0) / studentScores.length : undefined;
          const meta = subjectMeta.get(subjectName);

          const appreciation =
            studentAvg == null
              ? "Pas de note ce trimestre."
              : studentAvg >= 16
                ? "Excellent travail."
                : studentAvg >= 14
                  ? "Très bon travail."
                  : studentAvg >= 12
                    ? "Bon travail."
                    : studentAvg >= 10
                      ? "Peut mieux faire."
                      : "Résultats insuffisants.";

          return {
            subject: subjectName,
            teacher: meta?.teacher ?? undefined,
            coefficient: Number(meta?.coeff ?? 1),
            score: studentAvg,
            classMin: classScores.length ? Math.min(...classScores) : undefined,
            classMax: classScores.length ? Math.max(...classScores) : undefined,
            classAvg,
            termScores: studentAvg != null ? { [termLabel]: studentAvg } : {},
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

      // Class ranking for the current term (same weighting as the term average:
      // per-subject average weighted by subject coefficient).
      const weightedTermAvg = (bySubj: Map<string, number[]>): number | null => {
        let cs = 0;
        let ws = 0;
        for (const [subjectName, scores] of bySubj) {
          if (!scores.length) continue;
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const coeff = Number(subjectMeta.get(subjectName)?.coeff ?? 1);
          cs += coeff;
          ws += avg * coeff;
        }
        return cs ? ws / cs : null;
      };
      const classmateAverages: number[] = [];
      for (const bySubj of classStudentBySubject.values()) {
        const avg = weightedTermAvg(bySubj);
        if (avg != null) classmateAverages.push(avg);
      }
      const myAvg = termAverage ?? weightedTermAvg(classStudentBySubject.get(studentId) ?? new Map());
      if (myAvg != null && classmateAverages.length > 0) {
        rankTotal = classmateAverages.length;
        classRank = 1 + classmateAverages.filter((a) => a > myAvg + 1e-9).length;
      }

      // Trimester progression (overall weighted average per term) for the story.
      const { data: termList } = await admin
        .from("terms")
        .select("id, name, start_date")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: true });
      const termOrder = ((termList as Array<{ id: unknown; name: unknown }>) ?? []).map((t) => ({
        id: String(t.id),
        name: String(t.name),
      }));
      // The end-of-year (final) bulletin = the current term is the last one of the year.
      reportVariant =
        termOrder.length > 0 && String(currentTermId ?? "") === termOrder[termOrder.length - 1].id ? "final" : "term";
      termProgression = termOrder
        .map((t) => {
          const acc = studentByTerm.get(t.id);
          return acc && acc.coeff > 0 ? { term: t.name, average: Math.round((acc.sum / acc.coeff) * 100) / 100 } : null;
        })
        .filter((x): x is { term: string; average: number } => x !== null);

      const allTermAverages = Array.from(studentByTerm.values()).filter((t) => t.coeff > 0).map((t) => t.sum / t.coeff);
      annualAverage =
        allTermAverages.length >= 3 ? allTermAverages.reduce((a, b) => a + b, 0) / allTermAverages.length : null;

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

  const readOptionalAsset = async (fileName: string): Promise<Uint8Array | undefined> => {
    try {
      return new Uint8Array(await readFile(path.join(process.cwd(), "public", fileName)));
    } catch {
      return undefined;
    }
  };

  const imageTypeFor = (url: string, contentType: string | null): "png" | "jpg" | null => {
    const ct = (contentType ?? "").toLowerCase();
    if (ct.includes("png")) return "png";
    if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
    const lower = url.toLowerCase();
    if (lower.endsWith(".png")) return "png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
    return null;
  };

  const fetchRemoteImage = async (url: string | null): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | undefined> => {
    if (!url) return undefined;
    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const type = imageTypeFor(url, res.headers.get("content-type"));
      if (!type) return undefined;
      return { bytes: new Uint8Array(await res.arrayBuffer()), type };
    } catch {
      return undefined;
    }
  };

  // Prefer the school's uploaded branding; fall back to bundled assets.
  let logo = await fetchRemoteImage(schoolLogoUrl);
  if (!logo) {
    const local = await readOptionalAsset("logo.png");
    if (local) logo = { bytes: local, type: "png" };
  }

  let stamp = await fetchRemoteImage(schoolStampUrl);
  if (!stamp) {
    const localStamp = await readOptionalAsset("tampon.jpg");
    if (localStamp) stamp = { bytes: localStamp, type: "jpg" };
  }

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
      rank: classRank,
      rankTotal,
    },
    termProgression,
    variant: reportVariant,
    logo,
    stamp,
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
