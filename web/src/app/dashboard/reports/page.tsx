import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsPanel } from "../ReportsPanel";

export default function DashboardReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bulletins" subtitle="Génération et consultation des bulletins." />
      <ReportsPanel />
    </div>
  );
}
