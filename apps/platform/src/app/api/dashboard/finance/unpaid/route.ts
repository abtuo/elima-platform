import { NextResponse } from "next/server";
import { resolveFinanceActor } from "@/lib/finance/server";
import { getUnpaidStudents } from "@/lib/finance/queries";
import { checkSchoolFeature } from "@/lib/plans-server";

/** Full list of students with an outstanding balance. */
export async function GET(request: Request) {
  try {
    const actor = await resolveFinanceActor();
    if ("error" in actor) return actor.error;
    const planErr = await checkSchoolFeature(actor.schoolId, "finance", actor.role);
    if (planErr) return planErr;

    const url = new URL(request.url);
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));
    const unpaid = await getUnpaidStudents(actor.schoolId, limit);
    return NextResponse.json({ unpaid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
