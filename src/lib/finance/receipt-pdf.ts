import { PDFDocument, StandardFonts } from "pdf-lib";
import type { SchoolIdentity } from "@/lib/types";
import {
  A4,
  PDF_COLORS,
  drawFinanceFooter,
  drawFinanceHeader,
  drawText,
  money,
  paymentLabel,
  type PdfLogo,
} from "@/lib/finance/pdf-shared";

export async function buildPaymentReceiptPdf(input: {
  school: SchoolIdentity;
  studentName: string;
  className?: string;
  receiptNo: string;
  amount: number;
  currency: string;
  method: string;
  provider?: string | null;
  paidAt: string;
  balanceAfter?: { expected: number; paid: number; remaining: number } | null;
  logo?: PdfLogo;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  const margin = 40;
  const top = A4[1] - margin;
  const width = A4[0] - margin * 2;

  await drawFinanceHeader(pdf, page, {
    school: input.school,
    logo: input.logo,
    title: "FACTURE - FRAIS DE SCOLARITE",
    numberLabel: `N° ${input.receiptNo}`,
    fonts,
    margin,
    top,
  });

  const metaY = top - 218;
  const rows: [string, string][] = [
    ["Eleve", input.studentName],
    ["Classe", input.className || "-"],
    ["Date", new Date(input.paidAt).toLocaleDateString("fr-FR")],
    ["Paiement", paymentLabel(input.method, input.provider)],
  ];

  let ry = metaY;
  for (const [label, value] of rows) {
    drawText(page, `${label} :`, { x: margin, y: ry, size: 10, font: bold, color: PDF_COLORS.muted });
    drawText(page, value, { x: margin + 120, y: ry, size: 10, font: regular });
    ry -= 18;
  }

  const totalY = ry - 68;
  page.drawRectangle({ x: margin, y: totalY, width, height: 54, color: PDF_COLORS.primary });
  drawText(page, "Montant paye", { x: margin + 16, y: totalY + 32, size: 11, font: bold, color: PDF_COLORS.white });
  drawText(page, money(input.amount, input.currency), {
    x: A4[0] - margin - 150,
    y: totalY + 28,
    size: 16,
    font: bold,
    color: PDF_COLORS.white,
  });

  if (input.balanceAfter) {
    const b = input.balanceAfter;
    const balanceTop = totalY - 34;
    const balanceRows: [string, string][] = [
      ["Total attendu", money(b.expected, input.currency)],
      ["Total paye", money(b.paid, input.currency)],
      ["Reste a payer", money(b.remaining, input.currency)],
    ];

    page.drawRectangle({ x: margin, y: balanceTop - 82, width, height: 92, color: PDF_COLORS.light, borderColor: PDF_COLORS.line, borderWidth: 1 });
    drawText(page, "Situation apres paiement", { x: margin + 14, y: balanceTop - 14, size: 11, font: bold });

    let by = balanceTop - 38;
    for (const [label, value] of balanceRows) {
      drawText(page, label, { x: margin + 14, y: by, size: 9.5, font: regular, color: PDF_COLORS.muted });
      drawText(page, value, { x: margin + 190, y: by, size: 9.5, font: bold });
      by -= 18;
    }
  }

  drawFinanceFooter(page, { fonts, margin });

  return pdf.save();
}
