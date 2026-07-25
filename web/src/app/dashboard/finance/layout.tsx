import { DashboardPlanGate } from "@/components/ui/PlanGate";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPlanGate feature="finance">{children}</DashboardPlanGate>;
}
