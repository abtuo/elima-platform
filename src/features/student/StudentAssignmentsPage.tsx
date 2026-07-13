import { useEffect, useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { AssignmentCard } from "@/components/cards/AssignmentCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getStudentAssignments } from "@/services/assignmentService";
import type { Assignment } from "@/types/school";

export function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => { getStudentAssignments().then(setAssignments); }, []);

  return (
    <PageContainer>
      <AppHeader title="Devoirs" subtitle="À rendre et terminés" accent="#7C3AED" />
      <div className="space-y-3">
        {assignments.length ? assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />) : (
          <EmptyState title="Aucun devoir" description="Les devoirs publiés apparaîtront ici." />
        )}
      </div>
    </PageContainer>
  );
}
