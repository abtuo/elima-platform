import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AcademicMetric, ReportSubjectRow, SchoolIdentity, Student } from "@/lib/types";

const A4: [number, number] = [595.28, 841.89];

const COLORS = {
  primary: rgb(0.18, 0.55, 0.34), // #2E8B57
  secondary: rgb(1.0, 0.84, 0.0), // #FFD700
  accent: rgb(0.12, 0.16, 0.22), // #1F2937
  muted: rgb(0.45, 0.48, 0.55),
  line: rgb(0.86, 0.88, 0.9),
  light: rgb(0.97, 0.98, 0.99),
  white: rgb(1, 1, 1),
} as const;

function formatScore(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

function drawText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
    lineHeight?: number;
  },
) {
  const { x, y, size, font, color = COLORS.accent, maxWidth, lineHeight = size * 1.2 } = opts;
  if (!maxWidth) {
    page.drawText(text, { x, y, size, font, color });
    return;
  }

  // naive word-wrap
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: cursorY, size, font, color });
}

function drawCell(
  page: PDFPage,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    bg?: ReturnType<typeof rgb>;
    border?: ReturnType<typeof rgb>;
  },
) {
  const { x, y, w, h, bg, border = COLORS.line } = opts;
  if (bg) {
    page.drawRectangle({ x, y, width: w, height: h, color: bg });
  }
  page.drawRectangle({ x, y, width: w, height: h, borderColor: border, borderWidth: 1 });
}

export async function buildStudentReportPdf(input: {
  school: SchoolIdentity;
  student: Student;
  metric: AcademicMetric;
  term: string;
  academicYear: string;
  rows: ReportSubjectRow[];
  schoolStats?: {
    classSize?: number;
    section?: string;
  };
  logoPngBytes?: Uint8Array;
  stampJpgBytes?: Uint8Array;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const top = A4[1] - margin;

  // Header band
  page.drawRectangle({
    x: 0,
    y: top - 78,
    width: A4[0],
    height: 78,
    color: COLORS.light,
  });
  // inner green bar with margin for breathing room
  page.drawRectangle({
    x: margin,
    // place it below the header text block to avoid overlap
    y: top - 78 - 12,
    width: A4[0] - margin * 2,
    height: 4,
    color: COLORS.primary,
  });

  // Left column: school identity + contact (stacked)
  const headerLeftX = margin;
  let headerCursorY = top - 22;

  const rightLines = [
    input.school.name,
    input.school.address,
    [input.school.city, input.school.country].filter(Boolean).join(", "),
    input.school.phone ? `Tél: ${input.school.phone}` : undefined,
    input.school.email ? `Mail : ${input.school.email}` : undefined,
  ].filter(Boolean) as string[];

  rightLines.forEach((line, idx) => {
    const size = idx === 0 ? 12 : 9.5;
    const lineFont = idx === 0 ? bold : font;
    const color = idx === 0 ? COLORS.accent : COLORS.muted;
    drawText(page, line, {
      x: headerLeftX,
      y: headerCursorY,
      size,
      font: lineFont,
      color,
    });
    headerCursorY -= idx === 0 ? 14 : 12;
  });

  // Logo on the right
  if (input.logoPngBytes) {
    const logo = await pdf.embedPng(input.logoPngBytes);
    const targetW = 70;
    const scale = targetW / logo.width;
    const w = targetW;
    const h = logo.height * scale;
    page.drawImage(logo, {
      x: A4[0] - margin - w,
      y: top - 60,
      width: w,
      height: h,
    });
  }

  // Title
  drawText(page, `BULLETIN DE NOTES — ${input.term.toUpperCase()}`, {
    x: margin,
    y: top - 108,
    size: 16,
    font: bold,
    color: COLORS.accent,
  });
  // Academic year (make it unmistakable/visible)
  drawText(page, `Année scolaire : ${input.academicYear}`, {
    x: margin,
    y: top - 128,
    size: 11,
    font: bold,
    color: COLORS.muted,
  });

  // Student info block
  const infoY = top - 150;
  const infoH = 70;
  drawCell(page, { x: margin, y: infoY, w: A4[0] - margin * 2, h: infoH, bg: COLORS.white });
  page.drawRectangle({ x: margin, y: infoY + infoH - 6, width: A4[0] - margin * 2, height: 6, color: COLORS.secondary });

  const labelSize = 9;
  const valueSize = 11;

  drawText(page, "Nom :", { x: margin + 12, y: infoY + 44, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.student.fullName, { x: margin + 60, y: infoY + 42.5, size: valueSize, font: bold });

  drawText(page, "Classe :", { x: margin + 12, y: infoY + 22, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.student.className, { x: margin + 60, y: infoY + 20.5, size: valueSize, font: bold });

  const rightColX = margin + 290;
  drawText(page, "Effectif :", { x: rightColX, y: infoY + 44, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, String(input.schoolStats?.classSize ?? "-"), { x: rightColX + 60, y: infoY + 42.5, size: valueSize, font: bold });

  drawText(page, "Section :", { x: rightColX, y: infoY + 22, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.schoolStats?.section ?? "Générale", {
    x: rightColX + 60,
    y: infoY + 20.5,
    size: valueSize,
    font: bold,
  });

  // Also repeat academic year in the info block (right side) for clarity
  drawText(page, "Année :", {
    x: rightColX,
    y: infoY + 6,
    size: labelSize,
    font: bold,
    color: COLORS.muted,
  });
  drawText(page, input.academicYear, {
    x: rightColX + 60,
    y: infoY + 4.5,
    size: valueSize,
    font: bold,
  });

  // Table
  const tableX = margin;
  let tableY = infoY - 18;
  const tableW = A4[0] - margin * 2;
  const headerH = 22;
  const rowH = 26;

  const colW = {
    subject: 132,
    coeff: 34,
    score: 50,
    min: 44,
    max: 44,
    avg: 44,
    appreciation: tableW - (132 + 34 + 50 + 44 + 44 + 44),
  };

  // header
  drawCell(page, { x: tableX, y: tableY - headerH, w: tableW, h: headerH, bg: COLORS.accent, border: COLORS.accent });
  const hy = tableY - 15;
  const hs = 9.2;
  drawText(page, "Matières", { x: tableX + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Coef", { x: tableX + colW.subject + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Moy/20", { x: tableX + colW.subject + colW.coeff + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Min", { x: tableX + colW.subject + colW.coeff + colW.score + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Max", { x: tableX + colW.subject + colW.coeff + colW.score + colW.min + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Moy", { x: tableX + colW.subject + colW.coeff + colW.score + colW.min + colW.max + 8, y: hy, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Appréciations", {
    x: tableX + colW.subject + colW.coeff + colW.score + colW.min + colW.max + colW.avg + 8,
    y: hy,
    size: hs,
    font: bold,
    color: COLORS.white,
  });

  tableY = tableY - headerH;

  // rows
  input.rows.slice(0, 9).forEach((r, idx) => {
    const y = tableY - rowH;
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.light;
    drawCell(page, { x: tableX, y, w: tableW, h: rowH, bg });

    // vertical borders
    let x = tableX;
    const borders = [colW.subject, colW.coeff, colW.score, colW.min, colW.max, colW.avg];
    for (const w of borders) {
      x += w;
      page.drawLine({ start: { x, y }, end: { x, y: y + rowH }, color: COLORS.line, thickness: 1 });
    }

    drawText(page, r.subject, {
      x: tableX + 8,
      y: y + rowH - 12,
      size: 9.4,
      font: bold,
      maxWidth: colW.subject - 16,
    });
    if (r.teacher) {
      drawText(page, r.teacher, {
        x: tableX + 8,
        y: y + 6,
        size: 8.0,
        font,
        color: COLORS.muted,
        maxWidth: colW.subject - 16,
      });
    }

    const coeffX = tableX + colW.subject;
    drawText(page, r.coefficient !== undefined ? String(r.coefficient) : "-", {
      x: coeffX + 10,
      y: y + 8,
      size: 9.2,
      font,
    });

    const sx = tableX + colW.subject + colW.coeff;
    drawText(page, formatScore(r.score), { x: sx + 8, y: y + 9, size: 9.6, font: bold });

    const minX = sx + colW.score;
    drawText(page, formatScore(r.classMin), { x: minX + 8, y: y + 9, size: 9.2, font });
    const maxX = minX + colW.min;
    drawText(page, formatScore(r.classMax), { x: maxX + 8, y: y + 9, size: 9.2, font });
    const avgX = maxX + colW.max;
    drawText(page, formatScore(r.classAvg), { x: avgX + 8, y: y + 9, size: 9.2, font });

    const apprX = avgX + colW.avg;
    drawText(page, r.appreciation ?? "", {
      x: apprX + 8,
      y: y + rowH - 12,
      size: 8.2,
      font,
      color: COLORS.accent,
      maxWidth: colW.appreciation - 16,
      lineHeight: 9.8,
    });

    tableY = y;
  });

  // Summary blocks
  const summaryY = tableY - 18;
  const blockH = 54;
  const halfW = (tableW - 12) / 2;

  // Moyenne générale
  drawCell(page, { x: tableX, y: summaryY - blockH, w: halfW, h: blockH, bg: COLORS.white });
  page.drawRectangle({ x: tableX, y: summaryY - 18, width: halfW, height: 18, color: COLORS.accent });
  drawText(page, "Moyenne générale", { x: tableX + 10, y: summaryY - 14, size: 10, font: bold, color: COLORS.white });
  drawText(page, `${formatScore(input.student.average)}/20`, {
    x: tableX + 10,
    y: summaryY - 42,
    size: 18,
    font: bold,
    color: COLORS.primary,
  });

  // Absences
  const absX = tableX + halfW + 12;
  drawCell(page, { x: absX, y: summaryY - blockH, w: halfW, h: blockH, bg: COLORS.white });
  page.drawRectangle({ x: absX, y: summaryY - 18, width: halfW, height: 18, color: COLORS.accent });
  drawText(page, "Taux de présence", { x: absX + 10, y: summaryY - 14, size: 10, font: bold, color: COLORS.white });
  drawText(page, `${input.student.attendanceRate}%`, {
    x: absX + 10,
    y: summaryY - 42,
    size: 18,
    font: bold,
    color: COLORS.primary,
  });

  // Advice / council appreciation
  const councilY = summaryY - blockH - 18;
  const councilH = 62;
  drawCell(page, { x: tableX, y: councilY - councilH, w: tableW, h: councilH, bg: COLORS.white });
  page.drawRectangle({ x: tableX, y: councilY - 18, width: tableW, height: 18, color: COLORS.primary });
  drawText(page, "Appréciation générale", { x: tableX + 10, y: councilY - 14, size: 10, font: bold, color: COLORS.white });

  const riskSentence =
    input.metric.riskLevel === "HIGH"
      ? "Niveau de risque élevé : suivi renforcé recommandé."
      : input.metric.riskLevel === "MEDIUM"
        ? "Niveau de risque moyen : vigilance sur la régularité."
        : "Niveau de risque faible : continue sur cette lancée.";

  const appreciation =
    input.student.average >= 16
      ? "Excellent trimestre."
      : input.student.average >= 14
        ? "Très bon trimestre."
        : input.student.average >= 12
          ? "Bon trimestre."
          : input.student.average >= 10
            ? "Trimestre moyen, efforts à intensifier."
            : "Trimestre insuffisant, accompagnement nécessaire.";

  drawText(page, `${appreciation} ${riskSentence}`, {
    x: tableX + 10,
    y: councilY - 34,
    size: 9.6,
    font,
    maxWidth: tableW - 20,
    lineHeight: 12,
  });

  // Stamp (illustration tampon)
  if (input.stampJpgBytes) {
    const stamp = await pdf.embedJpg(input.stampJpgBytes);
    const targetW = 110;
    const scale = targetW / stamp.width;
    const w = targetW;
    const h = stamp.height * scale;
    page.drawImage(stamp, {
      x: A4[0] - margin - w,
      y: 44,
      width: w,
      height: h,
      opacity: 0.9,
    });
  }

  // Footer
  const footerY = 24;
  page.drawLine({ start: { x: margin, y: footerY + 16 }, end: { x: A4[0] - margin, y: footerY + 16 }, color: COLORS.line, thickness: 1 });
  drawText(page, "Elima — Apprendre. Connecter. Réussir.", {
    x: margin,
    y: footerY,
    size: 9,
    font: bold,
    color: COLORS.muted,
  });
  const dateStr = `Généré le ${new Date().toLocaleDateString("fr-FR")}`;
  drawText(page, dateStr, {
    x: A4[0] - margin - font.widthOfTextAtSize(dateStr, 9),
    y: footerY,
    size: 9,
    font,
    color: COLORS.muted,
  });

  return pdf.save();
}
