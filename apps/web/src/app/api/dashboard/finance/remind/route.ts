import { NextResponse } from "next/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getStudentBalance } from "@/lib/finance/queries";
import { notifyStudentThread, recordInternalNotification } from "@/lib/messaging/create";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { checkSchoolFeature } from "@/lib/plans-server";

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

/** Send an internal payment reminder to the parent thread (+ visible to admin). */
export async function POST(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "finance", actor.role);
    if (planErr) return planErr;

    const body = (await request.json().catch(() => null)) as { studentId?: string } | null;
    const studentId = body?.studentId?.trim();
    if (!studentId) {
      return NextResponse.json({ message: "studentId requis" }, { status: 400 });
    }

    const admin = await createSupabaseAdminServerClient();
    const { data: student } = await admin
      .from("students")
      .select("id, full_name, class_id, school_id, class:classes!students_class_id_fkey(name)")
      .eq("id", studentId)
      .eq("school_id", actor.schoolId)
      .maybeSingle();
    if (!student) {
      return NextResponse.json({ message: "Élève introuvable" }, { status: 404 });
    }

    const studentRow = student as { full_name: string; class?: Array<{ name?: string }> | null };
    const fullName = String(studentRow.full_name);
    const className = String(studentRow.class?.[0]?.name ?? "—");
    const classId = String((student as { class_id: string }).class_id);
    const balance = await getStudentBalance(actor.schoolId, studentId);
    const remaining = balance?.remaining ?? 0;
    if (remaining <= 0) {
      return NextResponse.json({ message: "Aucun impayé pour cet élève." }, { status: 400 });
    }

    const systemText = `Rappel de paiement : les frais de scolarité pour ${fullName} sont en attente. Montant : ${money(remaining)}. Échéance : fin juin 2026.`;

    const { conversationId } = await notifyStudentThread(admin, {
      schoolId: actor.schoolId,
      studentId,
      classId,
      type: "payment_reminder",
      title: `Paiement en attente — ${fullName}`,
      extraParticipantUserIds: [actor.userId],
      messages: [
        {
          senderId: null,
          senderRole: "SYSTEM",
          content: systemText,
          type: "payment_link",
          metadata: { href: `/parent/pay?child=${studentId}` },
        },
        {
          senderId: actor.userId,
          senderRole: "SCHOOL_ADMIN",
          content: `Bonjour, vous pouvez régler les frais de scolarité de ${fullName} (${className}) directement depuis Elima.`,
          type: "text",
        },
      ],
    });

    await recordInternalNotification(admin, {
      schoolId: actor.schoolId,
      studentId,
      type: "PAYMENT_REMINDER",
      message: systemText,
    });

    return NextResponse.json({
      ok: true,
      conversationId,
      channel: "internal",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
