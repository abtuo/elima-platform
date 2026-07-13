import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getAssignments } from "@/services/assignmentService";
import type { Assignment } from "@/types/school";

export function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => { getAssignments().then(setAssignments); }, []);

  return (
    <PageContainer>
      <AppHeader title="Devoirs" subtitle="Publiés et à venir" />
      <div className="space-y-3">
        {assignments.length ? assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />) : (
          <EmptyState title="Aucun devoir publié" description="Les devoirs publiés apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
