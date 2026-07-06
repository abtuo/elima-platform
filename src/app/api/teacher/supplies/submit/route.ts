import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher } from "@/lib/teacher/server";
import { getSupplyListForClass } from "@/lib/store/queries";
import { notifyClassStaffThread, recordSchoolNotification } from "@/lib/messaging/create";
import { checkSchoolFeature } from "@/lib/plans-server";

/** Submit a draft supply list for admin validation. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { classId?: string };
    const classId = body.classId?.trim();
    if (!classId) return NextResponse.json({ message: "classId requis" }, { status: 400 });

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const planErr = await checkSchoolFeature(ctx.schoolId, "store");
    if (planErr) return planErr;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId);
    if (assignmentError) return assignmentError;

    const list = await getSupplyListForClass(admin, ctx.schoolId, classId);
    if (!list) return NextResponse.json({ message: "Liste introuvable." }, { status: 404 });
    if (list.status === "published") {
      return NextResponse.json({ message: "Cette liste est déjà publiée." }, { status: 400 });
    }
    if (list.status === "pending_validation") {
      return NextResponse.json({ message: "Liste déjà soumise pour validation." }, { status: 400 });
    }
    if (list.items.length === 0) {
      return NextResponse.json({ message: "Ajoutez au moins un article avant de valider." }, { status: 400 });
    }

    const { data: teacherUser } = await admin.from("users").select("full_name").eq("id", ctx.userId).maybeSingle();
    const teacherName = String((teacherUser as { full_name?: string } | null)?.full_name ?? "Enseignant");

    const { error: updateErr } = await admin
      .from("supply_lists")
      .update({ status: "pending_validation" } as never)
      .eq("id", list.listId)
      .eq("school_id", ctx.schoolId);
    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    const itemSummary = list.items.map((i) => `${i.quantity}× ${i.name}`).slice(0, 5).join(", ");
    const more = list.items.length > 5 ? ` (+${list.items.length - 5} autres)` : "";
    const systemText = `Liste de fournitures soumise pour ${list.className} : ${list.items.length} article(s) — ${itemSummary}${more}.`;

    const { conversationId } = await notifyClassStaffThread(admin, {
      schoolId: ctx.schoolId,
      classId,
      type: "supply_list_review",
      title: `Fournitures à valider — ${list.className}`,
      extraParticipantUserIds: [ctx.userId],
      messages: [
        {
          senderId: ctx.userId,
          senderRole: "TEACHER",
          content: `${teacherName} a soumis la liste de fournitures pour ${list.className} (${list.items.length} articles). Merci de la valider et de l'envoyer aux parents.`,
          type: "text",
        },
        {
          senderId: null,
          senderRole: "SYSTEM",
          content: systemText,
          type: "text",
          metadata: { href: `/dashboard/supplies?classId=${classId}` },
        },
      ],
    });

    await recordSchoolNotification(admin, {
      schoolId: ctx.schoolId,
      type: "SUPPLY_LIST_SUBMITTED",
      message: systemText,
    });

    const updated = await getSupplyListForClass(admin, ctx.schoolId, classId);
    return NextResponse.json({ ok: true, conversationId, list: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
