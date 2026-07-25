// Pure finance rules — no runtime/server imports, safe to unit-test.

export type BalanceStatus = "paid" | "partial" | "unpaid";

/** Payment status from expected vs paid amounts. */
export function classifyBalance(expected: number, paid: number): {
  remaining: number;
  status: BalanceStatus;
} {
  const remaining = Math.max(0, expected - paid);
  const status: BalanceStatus =
    expected <= 0 || remaining <= 0.0001 ? "paid" : paid > 0 ? "partial" : "unpaid";
  return { remaining, status };
}
