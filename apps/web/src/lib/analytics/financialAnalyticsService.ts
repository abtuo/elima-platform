import { getFinanceOverview, getUnpaidStudents, type UnpaidRow } from "@/lib/finance/queries";

export { classifyCollection } from "@/lib/analytics/rules";

export type FinancialRisk = {
  collectionRate: number;
  totalRemaining: number;
  currency: string;
  parentsWithDebt: number;
  topDebtors: UnpaidRow[];
};

/** Aggregate the school's financial risk indicators (reuses finance queries). */
export async function getFinancialRisk(schoolId: string): Promise<FinancialRisk> {
  const [overview, debtors] = await Promise.all([
    getFinanceOverview(schoolId),
    getUnpaidStudents(schoolId, 5),
  ]);
  return {
    collectionRate: overview.collectionRate,
    totalRemaining: overview.totalRemaining,
    currency: overview.currency,
    parentsWithDebt: overview.studentsWithDebt,
    topDebtors: debtors,
  };
}
