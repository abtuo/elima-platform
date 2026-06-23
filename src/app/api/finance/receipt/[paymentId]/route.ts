import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getStudentBalance } from "@/lib/finance/queries";
import { assertStudentAccess } from "@/lib/portal/queries";
import { buildPaymentReceiptPdf } from "@/lib/finance/receipt-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const { paymentId } = await params;
    const admin = await createSupabaseAdminServerClient();

    const { data: payment } = await admin
      .from("payments")
      .select(
        `id, amount, method, status, receipt_no, paid_at, created_at, student_id, school_id,
         student:students!payments_student_id_fkey(
           full_name,
           class:classes!students_class_id_fkey(name),
           school:schools!students_school_id_fkey(name, city, country, phone, currency, logo_url)
         )`,
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment) return NextResponse.json({ message: "Paiement introuvable" }, { status: 404 });
    const paymentStudentId = String((payment as { student_id: string }).student_id);
    const paymentSchoolId = String((payment as { school_id: string }).school_id);

    // Authorize: finance staff of the same school OR a family member of the student.
    const actor = await resolveFinanceActor();
    const isFinanceStaff = !("error" in actor) && actor.schoolId === paymentSchoolId;
    if (!isFinanceStaff) {
      const access = await assertStudentAccess(paymentStudentId);
      if (!access) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
    }

    const studentWrap = (payment as { student?: Array<{ full_name?: string; class?: Array<{ name?: string }>; school?: Array<{ name?: string; city?: string; country?: string; phone?: string; currency?: string; logo_url?: string | null }> }> }).student?.[0];
    const schoolRow = studentWrap?.school?.[0];
    const currency = String(schoolRow?.currency ?? "XOF");

    const balance = await getStudentBalance(paymentSchoolId, paymentStudentId);

    let logo: { bytes: Uint8Array; type: "png" | "jpg" } | undefined;
    if (schoolRow?.logo_url) {
      try {
        const res = await fetch(String(schoolRow.logo_url));
        if (res.ok) {
          const ct = (res.headers.get("content-type") ?? "").toLowerCase();
          const type = ct.includes("png") ? "png" : ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : null;
          if (type) logo = { bytes: new Uint8Array(await res.arrayBuffer()), type };
        }
      } catch {
        // ignore remote logo failures
      }
    }
    if (!logo) {
      try {
        const local = await readFile(path.join(process.cwd(), "public", "logo.png"));
        logo = { bytes: new Uint8Array(local), type: "png" };
      } catch {
        // no bundled logo
      }
    }

    const pdfBytes = await buildPaymentReceiptPdf({
      school: {
        name: String(schoolRow?.name ?? "École"),
        city: schoolRow?.city ? String(schoolRow.city) : undefined,
        country: schoolRow?.country ? String(schoolRow.country) : undefined,
        phone: schoolRow?.phone ? String(schoolRow.phone) : undefined,
      },
      studentName: String(studentWrap?.full_name ?? "Élève"),
      className: studentWrap?.class?.[0]?.name ? String(studentWrap.class[0].name) : undefined,
      receiptNo: String((payment as { receipt_no?: string }).receipt_no ?? paymentId.slice(0, 8)),
      amount: Number((payment as { amount: number }).amount),
      currency,
      method: String((payment as { method: string }).method),
      paidAt: String((payment as { paid_at?: string; created_at: string }).paid_at ?? (payment as { created_at: string }).created_at),
      balanceAfter: balance,
      logo,
    });

    const safe = new Uint8Array(pdfBytes);
    return new NextResponse(new Blob([safe], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recu-${paymentId}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
