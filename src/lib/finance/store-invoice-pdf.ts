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

export async function buildStoreOrderInvoicePdf(input: {
  school: SchoolIdentity;
  studentName: string;
  className?: string;
  invoiceNo: string;
  totalAmount: number;
  currency: string;
  method: string;
  provider?: string | null;
  paidAt: string;
  pickupLocation: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>;
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
    title: "FACTURE - FOURNITURES",
    numberLabel: `N° ${input.invoiceNo}`,
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
    ["Retrait", input.pickupLocation],
  ];

  let ry = metaY;
  for (const [label, value] of rows) {
    drawText(page, `${label} :`, { x: margin, y: ry, size: 10, font: bold, color: PDF_COLORS.muted });
    drawText(page, value, { x: margin + 120, y: ry, size: 10, font: regular });
    ry -= 18;
  }

  const tableTitleY = ry - 18;
  drawText(page, "Detail de la commande", { x: margin, y: tableTitleY, size: 11, font: bold });

  let ty = tableTitleY - 26;
  page.drawRectangle({ x: margin, y: ty - 5, width, height: 21, color: PDF_COLORS.light });
  drawText(page, "Article", { x: margin + 8, y: ty, size: 9, font: bold, color: PDF_COLORS.muted });
  drawText(page, "Qte", { x: margin + 292, y: ty, size: 9, font: bold, color: PDF_COLORS.muted });
  drawText(page, "Prix unit.", { x: margin + 342, y: ty, size: 9, font: bold, color: PDF_COLORS.muted });
  drawText(page, "Total", { x: A4[0] - margin - 72, y: ty, size: 9, font: bold, color: PDF_COLORS.muted });
  ty -= 22;

  for (const item of input.items.slice(0, 15)) {
    drawText(page, item.name.slice(0, 38), { x: margin + 8, y: ty, size: 9, font: regular });
    drawText(page, String(item.quantity), { x: margin + 292, y: ty, size: 9, font: regular });
    drawText(page, money(item.unitPrice, input.currency), { x: margin + 342, y: ty, size: 9, font: regular });
    drawText(page, money(item.totalPrice, input.currency), {
      x: A4[0] - margin - 72,
      y: ty,
      size: 9,
      font: bold,
    });
    ty -= 18;
  }

  if (input.items.length > 15) {
    drawText(page, `+ ${input.items.length - 15} article(s) supplementaire(s)`, {
      x: margin + 8,
      y: ty,
      size: 9,
      font: regular,
      color: PDF_COLORS.muted,
    });
    ty -= 18;
  }

  page.drawRectangle({ x: margin, y: ty - 42, width, height: 54, color: PDF_COLORS.primary });
  drawText(page, "Total TTC", { x: margin + 16, y: ty - 12, size: 11, font: bold, color: PDF_COLORS.white });
  drawText(page, money(input.totalAmount, input.currency), {
    x: A4[0] - margin - 150,
    y: ty - 12,
    size: 16,
    font: bold,
    color: PDF_COLORS.white,
  });

  drawFinanceFooter(page, { fonts, margin });

  return pdf.save();
}
