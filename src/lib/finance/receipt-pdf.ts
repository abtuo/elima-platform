import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SchoolIdentity } from "@/lib/types";

const A4: [number, number] = [595.28, 841.89];

const COLORS = {
  primary: rgb(0.18, 0.55, 0.34),
  secondary: rgb(1.0, 0.84, 0.0),
  accent: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.45, 0.48, 0.55),
  line: rgb(0.86, 0.88, 0.9),
  light: rgb(0.97, 0.98, 0.99),
  white: rgb(1, 1, 1),
} as const;

function text(
  page: PDFPage,
  value: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> },
) {
  page.drawText(value, { x: opts.x, y: opts.y, size: opts.size, font: opts.font, color: opts.color ?? COLORS.accent });
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
  transfer: "Virement",
  cash: "Espèces",
};

export async function buildPaymentReceiptPdf(input: {
  school: SchoolIdentity;
  studentName: string;
  className?: string;
  receiptNo: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
  balanceAfter?: { expected: number; paid: number; remaining: number } | null;
  logo?: { bytes: Uint8Array; type: "png" | "jpg" };
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const top = A4[1] - margin;

  // Header
  page.drawRectangle({ x: 0, y: top - 78, width: A4[0], height: 78, color: COLORS.light });
  page.drawRectangle({ x: margin, y: top - 78 - 12, width: A4[0] - margin * 2, height: 4, color: COLORS.primary });

  const headerLines = [
    input.school.name,
    [input.school.city, input.school.country].filter(Boolean).join(", "),
    input.school.phone ? `Tél: ${input.school.phone}` : undefined,
  ].filter(Boolean) as string[];
  let cy = top - 22;
  headerLines.forEach((line, idx) => {
    text(page, line, {
      x: margin,
      y: cy,
      size: idx === 0 ? 12 : 9.5,
      font: idx === 0 ? bold : font,
      color: idx === 0 ? COLORS.accent : COLORS.muted,
    });
    cy -= idx === 0 ? 14 : 12;
  });

  if (input.logo) {
    const img = input.logo.type === "png" ? await pdf.embedPng(input.logo.bytes) : await pdf.embedJpg(input.logo.bytes);
    const w = 64;
    const h = (img.height / img.width) * w;
    page.drawImage(img, { x: A4[0] - margin - w, y: top - 58, width: w, height: h });
  }

  // Title
  text(page, "REÇU DE PAIEMENT", { x: margin, y: top - 108, size: 18, font: bold, color: COLORS.accent });
  text(page, `N° ${input.receiptNo}`, { x: margin, y: top - 128, size: 11, font: bold, color: COLORS.muted });

  // Info block
  const infoY = top - 320;
  const infoH = 170;
  const infoW = A4[0] - margin * 2;
  page.drawRectangle({ x: margin, y: infoY, width: infoW, height: infoH, color: COLORS.white, borderColor: COLORS.line, borderWidth: 1 });
  page.drawRectangle({ x: margin, y: infoY + infoH - 6, width: infoW, height: 6, color: COLORS.secondary });

  const rows: [string, string][] = [
    ["Élève", input.studentName],
    ["Classe", input.className || "—"],
    ["Date", new Date(input.paidAt).toLocaleDateString("fr-FR")],
    ["Moyen de paiement", METHOD_LABELS[input.method] ?? input.method],
  ];
  let ry = infoY + infoH - 34;
  for (const [label, value] of rows) {
    text(page, `${label} :`, { x: margin + 16, y: ry, size: 10, font: bold, color: COLORS.muted });
    text(page, value, { x: margin + 180, y: ry, size: 11, font: bold });
    ry -= 24;
  }

  // Amount highlight
  const amountY = infoY - 90;
  page.drawRectangle({ x: margin, y: amountY, width: infoW, height: 70, color: COLORS.primary });
  text(page, "Montant payé", { x: margin + 16, y: amountY + 46, size: 11, font: bold, color: COLORS.white });
  text(page, `${input.amount.toLocaleString("fr-FR")} ${input.currency}`, {
    x: margin + 16,
    y: amountY + 16,
    size: 24,
    font: bold,
    color: COLORS.white,
  });

  // Balance summary
  if (input.balanceAfter) {
    const b = input.balanceAfter;
    const by = amountY - 80;
    const lines: [string, string][] = [
      ["Total attendu", `${b.expected.toLocaleString("fr-FR")} ${input.currency}`],
      ["Total payé", `${b.paid.toLocaleString("fr-FR")} ${input.currency}`],
      ["Reste à payer", `${b.remaining.toLocaleString("fr-FR")} ${input.currency}`],
    ];
    let ly = by + 40;
    for (const [label, value] of lines) {
      text(page, label, { x: margin + 16, y: ly, size: 10, font, color: COLORS.muted });
      text(page, value, { x: margin + 200, y: ly, size: 10, font: bold });
      ly -= 18;
    }
  }

  // Footer
  const footerY = 24;
  page.drawLine({ start: { x: margin, y: footerY + 16 }, end: { x: A4[0] - margin, y: footerY + 16 }, color: COLORS.line, thickness: 1 });
  text(page, "Elima — gestion scolaire et financière.", { x: margin, y: footerY, size: 9, font: bold, color: COLORS.muted });
  const dateStr = `Généré le ${new Date().toLocaleDateString("fr-FR")} via Elima`;
  text(page, dateStr, {
    x: A4[0] - margin - font.widthOfTextAtSize(dateStr, 9),
    y: footerY,
    size: 9,
    font,
    color: COLORS.muted,
  });

  return pdf.save();
}
