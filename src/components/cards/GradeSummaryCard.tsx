import type { GradeSummary } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";
import { formatEvaluationTitle } from "@/lib/evaluationLabels";

export function GradeSummaryCard({ grade }: { grade: GradeSummary }) {
  const pct = Math.round((grade.score / grade.maxScore) * 100);
  return (
    <ElimaCard>
      <p className="text-xs text-gray-500">{grade.subject}</p>
      <h3 className="font-title mt-1 text-base font-semibold text-accent">{formatEvaluationTitle(grade.title, grade.subject)}</h3>
      <div className="mt-3 flex items-end justify-between">
        <p className="font-title text-2xl font-bold text-primary">{grade.score}/{grade.maxScore}</p>
        <span className="text-xs text-gray-400">{grade.date}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </ElimaCard>
  );
}
