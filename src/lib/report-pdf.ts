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

function shortTermLabel(name: string): string {
  const m = name.match(/(\d+)/);
  return m ? `T${m[1]}` : name.slice(0, 6);
}

/** Simple vertical bar chart (used for the end-of-year term-average evolution). */
function drawBarChart(
  page: PDFPage,
  fonts: { font: PDFFont; bold: PDFFont },
  opts: { x: number; y: number; w: number; h: number; data: { label: string; value: number }[] },
) {
  const { x, y, w, h, data } = opts;
  const n = Math.max(1, data.length);
  const gap = 14;
  const barW = Math.min(48, (w - gap * (n + 1)) / n);
  const baseline = y + 13;
  const maxBarH = h - 24;
  data.forEach((d, i) => {
    const bx = x + gap + i * (barW + gap);
    const value = Math.max(0, Math.min(20, d.value));
    const bh = Math.max(2, (value / 20) * maxBarH);
    page.drawRectangle({ x: bx, y: baseline, width: barW, height: bh, color: COLORS.primary });
    page.drawText(value.toFixed(1), { x: bx + barW / 2 - 7, y: baseline + bh + 3, size: 8, font: fonts.bold, color: COLORS.accent });
    page.drawText(d.label, { x: bx + barW / 2 - 5, y: y + 1, size: 8, font: fonts.font, color: COLORS.muted });
  });
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
    termAverage?: number | null;
    annualAverage?: number | null;
    rank?: number | null;
    rankTotal?: number | null;
  };
  termProgression?: { term: string; average: number }[];
  variant?: "term" | "final";
  generalAppreciation?: string | null;
  logo?: { bytes: Uint8Array; type: "png" | "jpg" };
  stamp?: { bytes: Uint8Array; type: "png" | "jpg" };
}) {
  const isFinal = input.variant === "final";
  const pdf = await PDFDocument.create();
  const embedImage = async (img: { bytes: Uint8Array; type: "png" | "jpg" }) =>
    img.type === "png" ? pdf.embedPng(img.bytes) : pdf.embedJpg(img.bytes);
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
  if (input.logo) {
    const logo = await embedImage(input.logo);
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
  drawText(page, isFinal ? "BULLETIN DE FIN D'ANNÉE" : `BULLETIN — ${input.term.toUpperCase()}`, {
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

  // Left column: Nom / Classe / Trimestre
  drawText(page, "Nom :", { x: margin + 12, y: infoY + 48, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.student.fullName, { x: margin + 70, y: infoY + 46.5, size: valueSize, font: bold });

  drawText(page, "Classe :", { x: margin + 12, y: infoY + 28, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.student.className, { x: margin + 70, y: infoY + 26.5, size: valueSize, font: bold });

  drawText(page, "Trimestre :", { x: margin + 12, y: infoY + 8, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.term, { x: margin + 70, y: infoY + 6.5, size: valueSize, font: bold });

  // Right column: Effectif / Section / Année
  const rightColX = margin + 290;
  drawText(page, "Effectif :", { x: rightColX, y: infoY + 48, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, String(input.schoolStats?.classSize ?? "-"), { x: rightColX + 60, y: infoY + 46.5, size: valueSize, font: bold });

  drawText(page, "Section :", { x: rightColX, y: infoY + 28, size: labelSize, font: bold, color: COLORS.muted });
  drawText(page, input.schoolStats?.section ?? "Générale", {
    x: rightColX + 60,
    y: infoY + 26.5,
    size: valueSize,
    font: bold,
  });

  drawText(page, "Année :", {
    x: rightColX,
    y: infoY + 8,
    size: labelSize,
    font: bold,
    color: COLORS.muted,
  });
  drawText(page, input.academicYear, {
    x: rightColX + 60,
    y: infoY + 6.5,
    size: valueSize,
    font: bold,
  });

  // Table
  const tableX = margin;
  let tableY = infoY - 18;
  const tableW = A4[0] - margin * 2;
  const headerRowH = 17;
  const headerH = headerRowH * 2;
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

  const classStatsX = tableX + colW.subject + colW.coeff + colW.score;
  const classStatsW = colW.min + colW.max + colW.avg;
  const appreciationX = classStatsX + classStatsW;

  // En-tête à deux lignes : « Classe » au-dessus de Min / Max / Moy
  const headerTop = tableY - headerH;
  drawCell(page, { x: tableX, y: headerTop, w: tableW, h: headerH, bg: COLORS.accent, border: COLORS.accent });

  const headerDividerY = headerTop + headerRowH;

  // Trait horizontal uniquement sous « Classe » (pas sur Matières / Coef / Moy/20 / Appréciations)
  page.drawLine({
    start: { x: classStatsX, y: headerDividerY },
    end: { x: classStatsX + classStatsW, y: headerDividerY },
    color: COLORS.white,
    thickness: 0.6,
  });

  // Séparateurs verticaux sur toute la hauteur (colonnes principales)
  const fullHeightSplits = [
    colW.subject,
    colW.subject + colW.coeff,
    colW.subject + colW.coeff + colW.score,
    colW.subject + colW.coeff + colW.score + colW.min + colW.max + colW.avg,
  ];
  for (const offset of fullHeightSplits) {
    page.drawLine({
      start: { x: tableX + offset, y: headerTop },
      end: { x: tableX + offset, y: headerTop + headerH },
      color: COLORS.white,
      thickness: 0.6,
    });
  }

  // Séparateurs Min / Max / Moy uniquement sur la rangée du bas
  const bottomRowSplits = [
    colW.subject + colW.coeff + colW.score + colW.min,
    colW.subject + colW.coeff + colW.score + colW.min + colW.max,
  ];
  for (const offset of bottomRowSplits) {
    page.drawLine({
      start: { x: tableX + offset, y: headerTop },
      end: { x: tableX + offset, y: headerDividerY },
      color: COLORS.white,
      thickness: 0.6,
    });
  }

  const hs = 9.2;
  const headerLabelY = headerTop + headerH / 2 - 4;
  const subHeaderLabelY = headerTop + 5;

  drawText(page, "Matières", { x: tableX + 8, y: headerLabelY, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Coef", { x: tableX + colW.subject + 8, y: headerLabelY, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Moy/20", { x: tableX + colW.subject + colW.coeff + 8, y: headerLabelY, size: hs, font: bold, color: COLORS.white });

  const classeLabel = "Classe";
  const classeLabelW = bold.widthOfTextAtSize(classeLabel, hs);
  drawText(page, classeLabel, {
    x: classStatsX + classStatsW / 2 - classeLabelW / 2,
    y: headerTop + headerRowH + 5,
    size: hs,
    font: bold,
    color: COLORS.white,
  });

  drawText(page, "Min", { x: classStatsX + 8, y: subHeaderLabelY, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Max", { x: classStatsX + colW.min + 8, y: subHeaderLabelY, size: hs, font: bold, color: COLORS.white });
  drawText(page, "Moy", { x: classStatsX + colW.min + colW.max + 8, y: subHeaderLabelY, size: hs, font: bold, color: COLORS.white });

  drawText(page, "Appréciations", {
    x: appreciationX + 8,
    y: headerLabelY,
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

  // ---- Summary blocks (term average + rank + attendance) ----
  const blockH = 54;
  const gapW = 10;
  const thirdW = (tableW - gapW * 2) / 3;
  let cursorY = tableY - 18;

  const summaryCard = (col: number, title: string, value: string) => {
    const x = tableX + col * (thirdW + gapW);
    drawCell(page, { x, y: cursorY - blockH, w: thirdW, h: blockH, bg: COLORS.white });
    page.drawRectangle({ x, y: cursorY - 18, width: thirdW, height: 18, color: COLORS.accent });
    drawText(page, title, { x: x + 10, y: cursorY - 14, size: 10, font: bold, color: COLORS.white });
    drawText(page, value, { x: x + 10, y: cursorY - 42, size: 18, font: bold, color: COLORS.primary });
  };

  const rank = input.schoolStats?.rank;
  const rankTotal = input.schoolStats?.rankTotal;
  const rankText = rank != null && rankTotal != null ? `${rank}${rank === 1 ? "er" : "e"} / ${rankTotal}` : "—";

  summaryCard(0, "Moyenne du trimestre", `${formatScore(input.schoolStats?.termAverage ?? input.student.average)}/20`);
  summaryCard(1, "Rang", rankText);
  summaryCard(2, "Taux de présence", `${input.student.attendanceRate}%`);

  cursorY = cursorY - blockH - 16;

  // ---- Final (end-of-year) only: evolution bar chart + general average ----
  if (isFinal) {
    const progression = (input.termProgression ?? []).filter((t) => Number.isFinite(t.average));
    const finalH = 92;
    const halfW = (tableW - 12) / 2;
    const absX = tableX + halfW + 12;

    drawCell(page, { x: tableX, y: cursorY - finalH, w: halfW, h: finalH, bg: COLORS.white });
    page.drawRectangle({ x: tableX, y: cursorY - 18, width: halfW, height: 18, color: COLORS.primary });
    drawText(page, "Évolution des moyennes", { x: tableX + 10, y: cursorY - 14, size: 10, font: bold, color: COLORS.white });
    if (progression.length >= 1) {
      drawBarChart(page, { font, bold }, {
        x: tableX + 6,
        y: cursorY - finalH + 6,
        w: halfW - 12,
        h: finalH - 26,
        data: progression.map((t) => ({ label: shortTermLabel(t.term), value: t.average })),
      });
    } else {
      drawText(page, "Données insuffisantes.", { x: tableX + 10, y: cursorY - finalH + 16, size: 9, font, color: COLORS.muted });
    }

    drawCell(page, { x: absX, y: cursorY - finalH, w: halfW, h: finalH, bg: COLORS.white });
    page.drawRectangle({ x: absX, y: cursorY - 18, width: halfW, height: 18, color: COLORS.primary });
    drawText(page, "Moyenne générale annuelle", { x: absX + 10, y: cursorY - 14, size: 10, font: bold, color: COLORS.white });
    const annual = input.schoolStats?.annualAverage;
    drawText(page, annual == null ? "—" : `${formatScore(annual)}/20`, {
      x: absX + 10,
      y: cursorY - 60,
      size: 26,
      font: bold,
      color: COLORS.primary,
    });
    drawText(page, "Moyenne des trois trimestres", { x: absX + 10, y: cursorY - finalH + 10, size: 8, font, color: COLORS.muted });

    cursorY = cursorY - finalH - 16;
  }

  // ---- Council appreciation ----
  const councilH = 56;
  drawCell(page, { x: tableX, y: cursorY - councilH, w: tableW, h: councilH, bg: COLORS.white });
  page.drawRectangle({ x: tableX, y: cursorY - 18, width: tableW, height: 18, color: COLORS.primary });
  drawText(page, "Appréciation générale", { x: tableX + 10, y: cursorY - 14, size: 10, font: bold, color: COLORS.white });

  const effectiveAverage = input.schoolStats?.termAverage ?? input.student.average;
  const defaultAppreciation =
    effectiveAverage >= 16
      ? "Excellent trimestre."
      : effectiveAverage >= 14
        ? "Très bon trimestre."
        : effectiveAverage >= 12
          ? "Bon trimestre."
          : effectiveAverage >= 10
            ? "Trimestre moyen, efforts à intensifier."
            : "Trimestre insuffisant, accompagnement nécessaire.";
  const appreciation = input.generalAppreciation?.trim() || defaultAppreciation;

  drawText(page, appreciation, {
    x: tableX + 10,
    y: cursorY - 36,
    size: 9.6,
    font,
    maxWidth: tableW - 20,
    lineHeight: 12,
  });

  // Stamp (illustration tampon)
  if (input.stamp) {
    const stamp = await embedImage(input.stamp);
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
  drawText(page, "Elima — la plateforme educative pour l'Afrique.", {
    x: margin,
    y: footerY,
    size: 9,
    font: bold,
    color: COLORS.muted,
  });
  const dateStr = `Genere le ${new Date().toLocaleDateString("fr-FR")} via la plateforme Elima — Tous droits reserves`;
  drawText(page, dateStr, {
    x: A4[0] - margin - font.widthOfTextAtSize(dateStr, 9),
    y: footerY,
    size: 9,
    font,
    color: COLORS.muted,
  });

  return pdf.save();
}
