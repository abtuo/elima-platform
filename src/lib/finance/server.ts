import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

const FINANCE_ROLES: AppRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COMPTABLE"];

export type FinanceActor = {
  schoolId: string;
  role: AppRole;
  userId: string;
};

/** Guard for finance endpoints: only admins and accountants of a school. */
export async function resolveFinanceActor(): Promise<FinanceActor | { error: NextResponse }> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) {
    return { error: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  const { data: userRow } = await admin
    .from("users")
    .select("role, school_id")
    .eq("id", authData.user.id)
    .maybeSingle();
  const role = (userRow as { role?: AppRole } | null)?.role;
  const schoolId = (userRow as { school_id?: string | null } | null)?.school_id;
  if (!role || !FINANCE_ROLES.includes(role)) {
    return { error: NextResponse.json({ message: "Accès réservé à l'administration / comptabilité" }, { status: 403 }) };
  }
  if (!schoolId) {
    return { error: NextResponse.json({ message: "École non rattachée" }, { status: 400 }) };
  }
  return { schoolId: String(schoolId), role, userId: String(authData.user.id) };
}

export function generateReceiptNo(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `REC-${ymd}-${rand}`;
}
