import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyBalance } from "@/lib/finance/rules";

export { classifyBalance } from "@/lib/finance/rules";

export type FinanceOverview = {
  schoolId: string;
  currency: string;
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
  studentsWithDebt: number;
  source: "model" | "legacy";
};

export type UnpaidRow = {
  studentId: string;
  fullName: string;
  className: string;
  parentPhone: string | null;
  expected: number;
  paid: number;
  remaining: number;
  status: "late" | "partial" | "unpaid";
};

export type StudentBalance = {
  studentId: string;
  expected: number;
  paid: number;
  remaining: number;
  status: "paid" | "partial" | "unpaid";
};

function toNum(v: number | string | null | undefined) {
  return Number(v || 0);
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /Could not find the table/i.test(msg) ||
    /does not exist/i.test(msg)
  );
}

export async function resolveCurrentSchoolId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) return null;
  const { data: userRow } = await admin.from("users").select("school_id").eq("id", authData.user.id).maybeSingle();
  return userRow?.school_id ? String(userRow.school_id) : null;
}

async function getCurrency(admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>, schoolId: string) {
  const { data } = await admin.from("schools").select("currency").eq("id", schoolId).maybeSingle();
  return String((data as { currency?: string | null } | null)?.currency ?? "XOF");
}

/**
 * Per-student expected/paid/remaining.
 * Prefers the normalized model (student_fees + payments). Falls back to the
 * legacy student_payments table (used by the demo seed) so the dashboard stays
 * populated until real fee data is entered.
 */
async function computeBalances(
  admin: Awaited<ReturnType<typeof createSupabaseAdminServerClient>>,
  schoolId: string,
): Promise<{ balances: Map<string, { expected: number; paid: number }>; source: "model" | "legacy" }> {
  const balances = new Map<string, { expected: number; paid: number }>();

  // 1) Normalized model.
  const { data: feeRows, error: feeErr } = await admin
    .from("student_fees")
    .select("student_id, amount_due")
    .eq("school_id", schoolId);

  const hasModelFees = !feeErr && (feeRows ?? []).length > 0;
  if (hasModelFees) {
    for (const f of feeRows ?? []) {
      const sid = String((f as { student_id: string }).student_id);
      const cur = balances.get(sid) ?? { expected: 0, paid: 0 };
      cur.expected += toNum((f as { amount_due: number }).amount_due);
      balances.set(sid, cur);
    }
    const { data: payRows } = await admin
      .from("payments")
      .select("student_id, amount, status")
      .eq("school_id", schoolId);
    for (const p of payRows ?? []) {
      const status = String((p as { status: string }).status);
      if (status === "pending") continue;
      const sid = String((p as { student_id: string }).student_id);
      const cur = balances.get(sid) ?? { expected: 0, paid: 0 };
      cur.paid += toNum((p as { amount: number }).amount);
      balances.set(sid, cur);
    }
    return { balances, source: "model" };
  }

  // 2) Legacy fallback (student_payments): treat every row's amount as expected,
  //    and rows with status 'paid' as collected.
  const { data: legacy, error: legacyErr } = await admin
    .from("student_payments")
    .select("student_id, amount, status")
    .eq("school_id", schoolId);
  if (legacyErr && isMissingRelationError(legacyErr)) {
    return { balances, source: "legacy" };
  }
  for (const p of legacy ?? []) {
    const sid = String((p as { student_id: string }).student_id);
    const cur = balances.get(sid) ?? { expected: 0, paid: 0 };
    const amount = toNum((p as { amount: number }).amount);
    cur.expected += amount;
    if (String((p as { status: string }).status) === "paid") cur.paid += amount;
    balances.set(sid, cur);
  }
  return { balances, source: "legacy" };
}

export async function getFinanceOverview(schoolId: string): Promise<FinanceOverview> {
  const admin = await createSupabaseAdminServerClient();
  const currency = await getCurrency(admin, schoolId);
  const { balances, source } = await computeBalances(admin, schoolId);

  let totalExpected = 0;
  let totalCollected = 0;
  let studentsWithDebt = 0;
  for (const v of balances.values()) {
    totalExpected += v.expected;
    totalCollected += v.paid;
    if (v.expected - v.paid > 0.0001) studentsWithDebt += 1;
  }
  const totalRemaining = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return {
    schoolId,
    currency,
    totalExpected,
    totalCollected,
    totalRemaining,
    collectionRate,
    studentsWithDebt,
    source,
  };
}

export async function getUnpaidStudents(schoolId: string, limit = 100): Promise<UnpaidRow[]> {
  const admin = await createSupabaseAdminServerClient();
  const { balances } = await computeBalances(admin, schoolId);

  const debtorIds = Array.from(balances.entries())
    .filter(([, v]) => v.expected - v.paid > 0.0001)
    .map(([id]) => id);
  if (debtorIds.length === 0) return [];

  const { data: studentRows } = await admin
    .from("students")
    .select("id, full_name, parent_phone, class:classes!students_class_id_fkey(name)")
    .eq("school_id", schoolId)
    .in("id", debtorIds);

  const byId = new Map(
    ((studentRows ?? []) as Array<{ id: string; full_name: string; parent_phone: string | null; class: Array<{ name: string }> | null }>).map(
      (s) => [String(s.id), s],
    ),
  );

  const rows: UnpaidRow[] = debtorIds.map((id) => {
    const bal = balances.get(id)!;
    const s = byId.get(id);
    const remaining = Math.max(0, bal.expected - bal.paid);
    const status: UnpaidRow["status"] = bal.paid <= 0 ? "unpaid" : "partial";
    return {
      studentId: id,
      fullName: String(s?.full_name ?? "Élève"),
      className: String(s?.class?.[0]?.name ?? ""),
      parentPhone: s?.parent_phone ?? null,
      expected: Math.round(bal.expected),
      paid: Math.round(bal.paid),
      remaining: Math.round(remaining),
      status,
    };
  });

  return rows.sort((a, b) => b.remaining - a.remaining).slice(0, limit);
}

/** Full debtor list (no limit) for CSV/Excel export. */
export async function getAllUnpaidStudents(schoolId: string): Promise<UnpaidRow[]> {
  return getUnpaidStudents(schoolId, 100000);
}

export async function getStudentBalance(schoolId: string, studentId: string): Promise<StudentBalance> {
  const admin = await createSupabaseAdminServerClient();
  const { balances } = await computeBalances(admin, schoolId);
  const bal = balances.get(studentId) ?? { expected: 0, paid: 0 };
  const { remaining, status } = classifyBalance(bal.expected, bal.paid);
  return {
    studentId,
    expected: Math.round(bal.expected),
    paid: Math.round(bal.paid),
    remaining: Math.round(remaining),
    status,
  };
}
