import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChildSummaryCard } from "@/components/cards/ChildSummaryCard";
import { GradeSummaryCard } from "@/components/cards/GradeSummaryCard";
import { useAuth } from "@/features/auth/AuthProvider";
import { getChildren, getRecentGrades } from "@/services/mainDataService";
import type { ChildSummary, GradeSummary } from "@/types/school";

export function ParentChildrenPage() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getChildren(profile.id).then((c) => {
      setChildren(c);
      if (c.length) setSelected(c[0].id);
    });
  }, [profile.id]);

  useEffect(() => { if (selected) getRecentGrades(selected).then(setGrades); else setGrades([]); }, [selected]);

  const active = children.find((c) => c.id === selected);

  return (
    <PageContainer>
      <AppHeader title="Enfants" subtitle="Suivi scolaire par enfant" />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {children.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c.id)}
            className={`tap shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${selected === c.id ? "bg-primary text-white" : "bg-white text-gray-600 shadow-sm"}`}
          >
            {c.name}
          </button>
        ))}
      </div>
      {active ? <ChildSummaryCard child={active} /> : null}
      <section className="mt-5 space-y-3">
        <h2 className="font-title text-lg font-semibold text-accent">Notes récentes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {grades.map((g) => <GradeSummaryCard key={g.id} grade={g} />)}
        </div>
      </section>
    </PageContainer>
  );
}
