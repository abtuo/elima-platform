import { DashboardPlanGate } from "@/components/ui/PlanGate";

export default function KpisLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPlanGate feature="kpis">{children}</DashboardPlanGate>;
}
