import type { Assignment } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";

const statusConfig = {
  pending: { label: "À faire", icon: Calendar, color: "text-amber-600 bg-amber-50" },
  done: { label: "Fait", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  late: { label: "En retard", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const cfg = statusConfig[assignment.status];
  const Icon = cfg.icon;

  return (
    <ElimaCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500">{assignment.subject} · {assignment.className}</p>
          <h3 className="font-title mt-1 text-base font-semibold text-accent">{assignment.title}</h3>
          <p className="mt-2 text-sm text-gray-500">Échéance : {assignment.dueDate}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
      </div>
    </ElimaCard>
  );
}
