import { NextResponse } from "next/server";
import { demoMetrics, demoReportRows, demoSchool, demoStudents } from "@/lib/demo-data";
import { buildStudentReportPdf } from "@/lib/report-pdf";
import { logEvent } from "@/lib/logger";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const student = demoStudents.find((s) => s.id === studentId) ?? demoStudents[0];
  const metric = demoMetrics.find((m) => m.studentId === student.id) ?? demoMetrics[0];

  const logoPath = path.join(process.cwd(), "public", "logo_elima.png");
  const logoPngBytes = new Uint8Array(await readFile(logoPath));
  const stampPath = path.join(process.cwd(), "public", "tampon.jpg");
  const stampJpgBytes = new Uint8Array(await readFile(stampPath));
  const rows = demoReportRows[student.id] ?? demoReportRows["stu-001"];

  const pdfBytes = await buildStudentReportPdf({
    school: demoSchool,
    student,
    metric,
    term: "Trimestre 1",
    academicYear: "2025-2026",
    rows,
    schoolStats: {
      classSize: 32,
      section: "Générale",
    },
    logoPngBytes,
    stampJpgBytes,
  });

  logEvent("INFO", "REPORT_PDF_GENERATED", {
    studentId: student.id,
    riskLevel: metric.riskLevel,
  });

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bulletin-${student.id}.pdf"`,
    },
  });
}
