import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getSupplyListForClass } from "@/lib/store/queries";
import { checkSchoolFeature } from "@/lib/plans-server";

/** Publish a class supply list (admin validation). */
export async function POST(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "store", actor.role);
    if (planErr) return planErr;

    const body = (await request.json()) as { classId?: string; listId?: string };
    const classId = body.classId?.trim();
    const listId = body.listId?.trim();
    if (!classId && !listId) {
      return NextResponse.json({ message: "classId ou listId requis" }, { status: 400 });
    }

    const admin = await createSupabaseAdminServerClient();
    let targetListId = listId;
    if (!targetListId && classId) {
      const list = await getSupplyListForClass(admin, actor.schoolId, classId);
      targetListId = list?.listId;
    }
    if (!targetListId) return NextResponse.json({ message: "Liste introuvable" }, { status: 404 });

    const { error } = await admin
      .from("supply_lists")
      .update({ status: "published" } as never)
      .eq("id", targetListId)
      .eq("school_id", actor.schoolId);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    const list = classId
      ? await getSupplyListForClass(admin, actor.schoolId, classId)
      : null;

    return NextResponse.json({ ok: true, listId: targetListId, list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
