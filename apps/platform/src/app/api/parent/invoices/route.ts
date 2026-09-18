import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/queries";
import { getParentInvoices } from "@/lib/finance/parent-invoices";
import { checkSchoolFeature } from "@/lib/plans-server";

export const dynamic = "force-dynamic";

/** All paid invoices (school fees + store orders) for the parent's children. */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.id) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

    const ctx = await getPortalContext();
    if (!ctx || ctx.role !== "PARENT") return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    if (ctx.schoolId) {
      const planErr = await checkSchoolFeature(ctx.schoolId, "parent_payments");
      if (planErr) return planErr;
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim();
    const studentIds = studentId
      ? ctx.students.filter((s) => s.id === studentId).map((s) => s.id)
      : ctx.students.map((s) => s.id);

    const admin = await createSupabaseAdminServerClient();
    const invoices = await getParentInvoices(admin, studentIds);

    return NextResponse.json({ invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
