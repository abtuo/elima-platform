import type { QuizItem } from "@/types/revision";
import { ElimaCard } from "@/components/common/ElimaCard";
import { Brain } from "lucide-react";

export function QuizCard({ quiz }: { quiz: QuizItem }) {
  return (
    <ElimaCard>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
          <Brain className="h-5 w-5 text-revision" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{quiz.subject}</p>
          <h3 className="font-title text-base font-semibold text-accent">{quiz.topic}</h3>
          <p className="mt-1 text-sm text-gray-500">{quiz.questionCount} questions · {quiz.difficulty}</p>
        </div>
      </div>
    </ElimaCard>
  );
}
