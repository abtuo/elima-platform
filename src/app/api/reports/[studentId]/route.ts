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

  const logoPath = path.join(process.cwd(), "public", "logo_e-lima.png");
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

  // NextResponse expects a `BodyInit`.
  // With TS' newer typed-array generics, `Uint8Array<ArrayBufferLike>` may be seen
  // as potentially backed by a `SharedArrayBuffer`, which then fails `BodyInit`
  // and `BlobPart` type checks.
  //
  // We force a copy into a fresh `Uint8Array` backed by a regular `ArrayBuffer`.
  const safePdfBytes = new Uint8Array(pdfBytes);
  const pdfBlob = new Blob([safePdfBytes], { type: "application/pdf" });

  return new NextResponse(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bulletin-${student.id}.pdf"`,
    },
  });
}
