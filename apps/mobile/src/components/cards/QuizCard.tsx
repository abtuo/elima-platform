import type { QuizItem } from "@/types/revision";
import { ElimaCard } from "@/components/common/ElimaCard";
import { SubjectIcon } from "@/components/revision/SubjectIcon";

export function QuizCard({ quiz }: { quiz: QuizItem }) {
  return (
    <ElimaCard>
      <div className="flex items-start gap-3">
        <SubjectIcon subject={quiz.subject} />
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500">{quiz.subject}</p>
          <h3 className="font-title text-base font-semibold text-accent">{quiz.topic}</h3>
          <p className="mt-1 text-sm text-gray-500">{quiz.questionCount} questions · {quiz.difficulty}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
