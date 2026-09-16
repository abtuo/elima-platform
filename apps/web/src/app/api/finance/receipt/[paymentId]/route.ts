import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getStudentBalance } from "@/lib/finance/queries";
import { assertStudentAccess } from "@/lib/portal/queries";
import { buildPaymentReceiptPdf } from "@/lib/finance/receipt-pdf";
import {
  SCHOOL_INVOICE_SELECT,
  currencyFromSchool,
  firstRelation,
  loadSchoolLogo,
  resolveSchoolForInvoice,
  schoolIdentityFromRow,
} from "@/lib/finance/invoice-school";

type StudentRelation = {
  full_name?: string;
  class?: { name?: string } | Array<{ name?: string }> | null;
  school?: { name?: string; city?: string; country?: string; phone?: string; address?: string; currency?: string; logo_url?: string | null } | Array<{
    name?: string;
    city?: string;
    country?: string;
    phone?: string;
    address?: string;
    currency?: string;
    logo_url?: string | null;
  }> | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const { paymentId } = await params;
    const admin = await createSupabaseAdminServerClient();

    const { data: payment } = await admin
      .from("payments")
      .select(
        `id, amount, method, payment_provider, status, receipt_no, paid_at, created_at, student_id, school_id,
         student:students!payments_student_id_fkey(
           full_name,
           class:classes!students_class_id_fkey(name),
           school:schools!students_school_id_fkey(${SCHOOL_INVOICE_SELECT})
         )`,
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment) return NextResponse.json({ message: "Paiement introuvable" }, { status: 404 });
    const paymentStudentId = String((payment as { student_id: string }).student_id);
    const paymentSchoolId = String((payment as { school_id: string }).school_id);

    const actor = await resolveFinanceActor();
    const isFinanceStaff = !("error" in actor) && actor.schoolId === paymentSchoolId;
    if (!isFinanceStaff) {
      const access = await assertStudentAccess(paymentStudentId);
      if (!access) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }

    const studentWrap = firstRelation((payment as { student?: StudentRelation | StudentRelation[] }).student);
    const classRow = firstRelation(studentWrap?.class);
    const schoolRow = await resolveSchoolForInvoice(
      admin,
      paymentSchoolId,
      firstRelation(studentWrap?.school),
    );
    const currency = currencyFromSchool(schoolRow);
    const balance = await getStudentBalance(paymentSchoolId, paymentStudentId);
    const logo = await loadSchoolLogo(admin, schoolRow, _request.url);

    const receiptNo = String((payment as { receipt_no?: string }).receipt_no ?? paymentId.slice(0, 8));
    const pdfBytes = await buildPaymentReceiptPdf({
      school: schoolIdentityFromRow(schoolRow),
      studentName: String(studentWrap?.full_name ?? "\u00c9l\u00e8ve"),
      className: classRow?.name ? String(classRow.name) : undefined,
      receiptNo,
      amount: Number((payment as { amount: number }).amount),
      currency,
      method: String((payment as { method: string }).method),
      provider: (payment as { payment_provider?: string | null }).payment_provider,
      paidAt: String((payment as { paid_at?: string; created_at: string }).paid_at ?? (payment as { created_at: string }).created_at),
      balanceAfter: balance,
      logo,
    });

    const safe = new Uint8Array(pdfBytes);
    return new NextResponse(new Blob([safe], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${receiptNo}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
