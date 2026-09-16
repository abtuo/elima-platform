import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StudentPortalView } from "@/components/portal/StudentPortalView";
import { getPortalContext } from "@/lib/portal/queries";

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const ctx = await getPortalContext();
  const children = ctx?.students ?? [];
  const { child } = await searchParams;

  if (children.length === 0) {
    return (
      <EmptyState
        title="Aucun enfant rattaché"
        description="Votre compte n'est pas encore associé à un élève. Contactez l'établissement."
      />
    );
  }

  const selected = children.find((c) => c.id === child) ?? children[0];

  return (
    <div className="space-y-6">
      <ChildSwitcher
        childrenList={children.map((c) => ({
          student_id: c.id,
          full_name: c.fullName,
          class_id: c.classId,
          class_name: c.className,
        }))}
        selectedStudentId={selected.id}
        basePath="/parent"
      />
      <StudentPortalView student={selected} audience="parent" />
    </div>
  );
}
