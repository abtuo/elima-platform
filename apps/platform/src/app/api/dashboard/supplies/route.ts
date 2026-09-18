import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getSchoolSupplyLists, getSupplyListForClass } from "@/lib/store/queries";
import { checkSchoolFeature } from "@/lib/plans-server";

export const dynamic = "force-dynamic";

/** All class supply lists for the school admin. */
export async function GET(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "store", actor.role);
    if (planErr) return planErr;

    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const admin = await createSupabaseAdminServerClient();

    if (classId) {
      const list = await getSupplyListForClass(admin, actor.schoolId, classId);
      return NextResponse.json({ list });
    }

    const lists = await getSchoolSupplyLists(admin, actor.schoolId);
    return NextResponse.json({ lists });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
