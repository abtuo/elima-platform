import type { ChildSummary } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";

export function ChildSummaryCard({ child }: { child: ChildSummary }) {
  return (
    <ElimaCard>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-title text-lg font-semibold text-accent">{child.name}</h3>
          <p className="text-sm text-gray-500">{child.className}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {child.recentGrade}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Absences</p>
          <p className="font-semibold text-accent">{child.absences}</p>
        </div>
        <div>
          <p className="text-gray-500">Devoirs</p>
          <p className="font-semibold text-accent">{child.pendingAssignments}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
