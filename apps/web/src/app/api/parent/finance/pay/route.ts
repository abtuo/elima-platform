import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { assertStudentAccess } from "@/lib/portal/queries";
import { getStudentBalance } from "@/lib/finance/queries";
import { generateReceiptNo } from "@/lib/finance/server";
import { getAppNow } from "@/lib/app-date";
import { notifyStudentThread, recordInternalNotification } from "@/lib/messaging/create";
import { checkSchoolFeature } from "@/lib/plans-server";

const paySchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["mobile_money", "card"]),
  provider: z.string().optional(),
});

const METHOD_LABELS: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
};

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

/** Simulated parent payment (demo): records payment + notifies admin in payment thread. */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

    const json = await request.json();
    const parsed = paySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Données invalides" }, { status: 400 });
    }

    const student = await assertStudentAccess(parsed.data.studentId);
    if (!student) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    const planErr = await checkSchoolFeature(student.schoolId, "parent_payments");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();
    const balance = await getStudentBalance(student.schoolId, student.id);
    const remaining = balance?.remaining ?? 0;
    if (remaining <= 0) {
      return NextResponse.json({ message: "Aucun solde à régler." }, { status: 400 });
    }
    if (parsed.data.amount > remaining + 0.01) {
      return NextResponse.json({ message: `Montant maximum : ${money(remaining)}` }, { status: 400 });
    }

    const receiptNo = generateReceiptNo();
    const paidAt = getAppNow().toISOString();
    const providerLabel = parsed.data.provider?.trim() || (parsed.data.method === "card" ? "Visa / Mastercard" : "Orange Money");

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .insert({
        school_id: student.schoolId,
        student_id: student.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        payment_provider: providerLabel,
        status: "paid",
        receipt_no: receiptNo,
        paid_at: paidAt,
      } as never)
      .select("id")
      .single();
    if (payErr || !payment) return NextResponse.json({ message: payErr?.message ?? "Paiement échoué" }, { status: 400 });

    const paymentId = String((payment as { id: string }).id);
    const newBalance = await getStudentBalance(student.schoolId, student.id);
    const newRemaining = newBalance?.remaining ?? 0;
    const methodLabel = METHOD_LABELS[parsed.data.method] ?? parsed.data.method;

    const parentText = `Paiement effectué : ${money(parsed.data.amount)} via ${methodLabel} (${providerLabel}).`;
    const systemText =
      newRemaining <= 0
        ? `Paiement confirmé : ${money(parsed.data.amount)} reçu pour ${student.fullName}. Solde soldé. Reçu ${receiptNo}.`
        : `Paiement partiel confirmé : ${money(parsed.data.amount)} reçu pour ${student.fullName}. Reste : ${money(newRemaining)}. Reçu ${receiptNo}.`;

    const { conversationId } = await notifyStudentThread(admin, {
      schoolId: student.schoolId,
      studentId: student.id,
      classId: student.classId,
      type: "payment_reminder",
      title: `Paiement en attente — ${student.fullName}`,
      extraParticipantUserIds: [userId],
      messages: [
        { senderId: userId, senderRole: "PARENT", content: parentText, type: "text" },
        { senderId: null, senderRole: "SYSTEM", content: systemText, type: "payment_link", metadata: { href: `/parent/pay?child=${student.id}` } },
      ],
    });

    await recordInternalNotification(admin, {
      schoolId: student.schoolId,
      studentId: student.id,
      type: newRemaining <= 0 ? "PAYMENT_RECEIVED" : "PAYMENT_PARTIAL",
      message: systemText,
    });

    return NextResponse.json({
      ok: true,
      paymentId,
      receiptNo,
      conversationId,
      remaining: newRemaining,
      paid: parsed.data.amount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Balance summary for parent payment page. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim();
    if (!studentId) return NextResponse.json({ message: "studentId requis" }, { status: 400 });

    const student = await assertStudentAccess(studentId);
    if (!student) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    const planErr = await checkSchoolFeature(student.schoolId, "parent_payments");
    if (planErr) return planErr;

    const balance = await getStudentBalance(student.schoolId, studentId);
    return NextResponse.json({
      student: { id: student.id, fullName: student.fullName, className: student.className },
      balance: balance ?? { expected: 0, paid: 0, remaining: 0, status: "paid" },
      currency: "FCFA",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
