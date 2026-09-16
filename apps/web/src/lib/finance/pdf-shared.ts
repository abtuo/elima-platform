import { rgb, type PDFFont, type PDFDocument, type PDFPage } from "pdf-lib";
import type { SchoolIdentity } from "@/lib/types";

export const A4: [number, number] = [595.28, 841.89];

export const PDF_COLORS = {
  primary: rgb(0.18, 0.55, 0.34),
  secondary: rgb(1.0, 0.84, 0.0),
  accent: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.45, 0.48, 0.55),
  line: rgb(0.86, 0.88, 0.9),
  light: rgb(0.97, 0.98, 0.99),
  white: rgb(1, 1, 1),
} as const;

export type PdfLogo = { bytes: Uint8Array; type: "png" | "jpg" };
export type PdfFonts = { regular: PDFFont; bold: PDFFont };

export function toPdfText(value: string) {
  return value
    .replace(/[\u202f\u00a0]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00ab\s*/g, '" ')
    .replace(/\s*\u00bb/g, ' "')
    .replace(/[\u2022\u00b7]/g, "-");
}

export function drawText(
  page: PDFPage,
  value: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> },
) {
  page.drawText(toPdfText(value), {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? PDF_COLORS.accent,
  });
}

export function money(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} ${currency}`;
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
  transfer: "Virement",
  cash: "Especes",
};

export function paymentLabel(method: string, provider?: string | null) {
  const label = METHOD_LABELS[method] ?? method;
  const providerText = provider?.trim();
  return providerText ? `${label} (${providerText})` : label;
}

export async function drawFinanceHeader(
  pdf: PDFDocument,
  page: PDFPage,
  input: {
    school: SchoolIdentity;
    logo?: PdfLogo;
    title: string;
    numberLabel: string;
    fonts: PdfFonts;
    margin: number;
    top: number;
  },
) {
  const { regular, bold } = input.fonts;
  const { margin, top } = input;

  page.drawRectangle({ x: 0, y: top - 78, width: A4[0], height: 78, color: PDF_COLORS.light });
  page.drawRectangle({ x: margin, y: top - 90, width: A4[0] - margin * 2, height: 4, color: PDF_COLORS.primary });

  const headerLines = [
    input.school.name,
    input.school.address,
    [input.school.city, input.school.country].filter(Boolean).join(", "),
    input.school.phone ? `Tel: ${input.school.phone}` : undefined,
  ].filter(Boolean) as string[];

  let cy = top - 22;
  headerLines.forEach((line, idx) => {
    drawText(page, line, {
      x: margin,
      y: cy,
      size: idx === 0 ? 12 : 9.5,
      font: idx === 0 ? bold : regular,
      color: idx === 0 ? PDF_COLORS.accent : PDF_COLORS.muted,
    });
    cy -= idx === 0 ? 14 : 12;
  });

  if (input.logo) {
    const img = input.logo.type === "png" ? await pdf.embedPng(input.logo.bytes) : await pdf.embedJpg(input.logo.bytes);
    const w = 64;
    const h = (img.height / img.width) * w;
    page.drawImage(img, { x: A4[0] - margin - w, y: top - 58, width: w, height: h });
  }

  drawText(page, input.title, { x: margin, y: top - 108, size: 18, font: bold, color: PDF_COLORS.accent });
  drawText(page, input.numberLabel, { x: margin, y: top - 128, size: 11, font: bold, color: PDF_COLORS.muted });
}

export function drawFinanceFooter(page: PDFPage, input: { fonts: PdfFonts; margin: number }) {
  const footerY = 24;
  const { regular, bold } = input.fonts;
  page.drawLine({
    start: { x: input.margin, y: footerY + 16 },
    end: { x: A4[0] - input.margin, y: footerY + 16 },
    color: PDF_COLORS.line,
    thickness: 1,
  });
  drawText(page, "Elima, la plateforme educative intelligente.", {
    x: input.margin,
    y: footerY,
    size: 9,
    font: bold,
    color: PDF_COLORS.muted,
  });
  const dateStr = `Edite le ${new Date().toLocaleDateString("fr-FR")} via la plateforme Elima. Tous droits reserves`;
  drawText(page, dateStr, {
    x: A4[0] - input.margin - regular.widthOfTextAtSize(dateStr, 9),
    y: footerY,
    size: 9,
    font: regular,
    color: PDF_COLORS.muted,
  });
}
