import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { DashboardPlanGate } from "@/components/ui/PlanGate";
import { PedagogyWorkshop } from "./PedagogyWorkshop";

export default function TeacherResourcesPage() {
  return (
    <div className="space-y-6">
      <ProgressHeader title="Ressources" subtitle="Créez, relisez et validez vos supports pédagogiques structurés." />
      <DashboardPlanGate feature="ai_import">
        <PedagogyWorkshop />
      </DashboardPlanGate>
    </div>
  );
}
