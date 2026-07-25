import { DashboardPlanGate } from "@/components/ui/PlanGate";

export default function SuppliesLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPlanGate feature="store">{children}</DashboardPlanGate>;
}
