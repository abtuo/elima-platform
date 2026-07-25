import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor, generateReceiptNo } from "@/lib/finance/server";
import { getFinanceOverview, getUnpaidStudents } from "@/lib/finance/queries";
import { paymentInputSchema } from "@/lib/validation";
import { checkSchoolFeature } from "@/lib/plans-server";

/** Finance dashboard payload: KPIs + top unpaid. */
export async function GET() {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "finance", actor.role);
    if (planErr) return planErr;

    const [overview, unpaid] = await Promise.all([
      getFinanceOverview(actor.schoolId),
      getUnpaidStudents(actor.schoolId, 10),
    ]);
    return NextResponse.json({ overview, unpaid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Record a payment (encaissement) into the normalized payments table. */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = paymentInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Données invalides", issues: parsed.error.issues }, { status: 400 });
    }
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "finance", actor.role);
    if (planErr) return planErr;
    const admin = await createSupabaseAdminServerClient();

    // Ensure the student belongs to the actor's school.
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("id", parsed.data.studentId)
      .eq("school_id", actor.schoolId)
      .maybeSingle();
    if (!student) return NextResponse.json({ message: "Élève introuvable" }, { status: 404 });

    const receiptNo = generateReceiptNo();
    const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt).toISOString() : new Date().toISOString();

    const { data, error } = await admin
      .from("payments")
      .insert({
        school_id: actor.schoolId,
        student_id: parsed.data.studentId,
        student_fee_id: parsed.data.studentFeeId ?? null,
        installment_id: parsed.data.installmentId ?? null,
        amount: parsed.data.amount,
        method: parsed.data.method,
        status: "paid",
        receipt_no: receiptNo,
        paid_at: paidAt,
      } as never)
      .select("id, receipt_no")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      id: (data as { id: string }).id,
      receiptNo: (data as { receipt_no: string }).receipt_no,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
