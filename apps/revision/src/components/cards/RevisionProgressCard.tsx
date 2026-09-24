import type { RevisionProgress } from "@/types/revision";
import { ElimaCard } from "@/components/common/ElimaCard";
import { Flame, Star, Zap } from "lucide-react";

export function RevisionProgressCard({ progress }: { progress: RevisionProgress }) {
  const nextLevelXp = progress.level * 100;
  const currentLevelXp = (progress.level - 1) * 100;
  const pct = Math.min(100, Math.round(((progress.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  return (
    <ElimaCard className="bg-gradient-to-br from-revision to-purple-700 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/80">Niveau {progress.level}</p>
          <p className="font-title text-3xl font-bold">{progress.xp} XP</p>
        </div>
        <Star className="h-10 w-10 text-secondary" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 flex gap-4 text-sm">
        <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-secondary" /> {progress.streakDays} jours</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-secondary" /> {progress.completedQuizCount} quiz</span>
      </div>
    </ElimaCard>
  );
}
