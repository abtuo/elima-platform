import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getSupplyListForClass } from "@/lib/store/queries";
import { checkSchoolFeature } from "@/lib/plans-server";
import {
  notifyClassStaffThread,
  notifyStudentThread,
  recordInternalNotification,
  resolveClassTeacherUserIds,
} from "@/lib/messaging/create";

function money(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

/** Notify all parents in a class that the supply list is available. */
export async function POST(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "store", actor.role);
    if (planErr) return planErr;

    const body = (await request.json()) as { classId?: string };
    const classId = body.classId?.trim();
    if (!classId) return NextResponse.json({ message: "classId requis" }, { status: 400 });

    const admin = await createSupabaseAdminServerClient();
    const list = await getSupplyListForClass(admin, actor.schoolId, classId, { publishedOnly: true });
    if (!list || list.items.length === 0) {
      return NextResponse.json({ message: "Publiez d'abord une liste avec des articles." }, { status: 400 });
    }

    const totalEstimate = list.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const { data: students } = await admin
      .from("students")
      .select("id, full_name, class_id")
      .eq("school_id", actor.schoolId)
      .eq("class_id", classId);

    let sent = 0;
    for (const row of (students ?? []) as Array<{ id: string; full_name: string; class_id: string }>) {
      const studentId = String(row.id);
      const fullName = String(row.full_name);
      const systemText = `La liste de fournitures ${list.className} est disponible (${list.items.length} articles, env. ${money(totalEstimate)}). Commandez sur Elima Store.`;
      await notifyStudentThread(admin, {
        schoolId: actor.schoolId,
        studentId,
        classId,
        type: "store_order",
        title: `Fournitures scolaires — ${fullName}`,
        messages: [
          {
            senderId: null,
            senderRole: "SYSTEM",
            content: systemText,
            type: "store_link",
            metadata: { href: `/parent/store?child=${studentId}` },
          },
          {
            senderId: actor.userId,
            senderRole: "SCHOOL_ADMIN",
            content: `Bonjour, la liste de fournitures pour ${fullName} (${list.className}) est prête. Vous pouvez sélectionner les articles et commander directement depuis Elima.`,
            type: "text",
          },
        ],
      });
      await recordInternalNotification(admin, {
        schoolId: actor.schoolId,
        studentId,
        type: "STORE_LIST_PUBLISHED",
        message: systemText,
      });
      sent += 1;
    }

    const teacherUserIds = await resolveClassTeacherUserIds(admin, classId);
    await notifyClassStaffThread(admin, {
      schoolId: actor.schoolId,
      classId,
      type: "supply_list_review",
      title: `Fournitures — ${list.className}`,
      extraParticipantUserIds: teacherUserIds,
      messages: [
        {
          senderId: null,
          senderRole: "SYSTEM",
          content: `La liste de fournitures pour ${list.className} a été validée et envoyée aux parents (${sent} élève(s)).`,
          type: "text",
        },
      ],
    });

    return NextResponse.json({ ok: true, notified: sent, className: list.className });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
