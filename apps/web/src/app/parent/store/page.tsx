import { ShoppingBag } from "lucide-react";
import { ChildSwitcher } from "@/components/ui/ChildSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ParentStoreForm } from "@/components/parent/ParentStoreForm";
import { PortalPlanGate } from "@/components/ui/PlanGate";
import { getPortalContext } from "@/lib/portal/queries";

export default async function ParentStorePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; student?: string }>;
}) {
  const ctx = await getPortalContext();
  const children = ctx?.students ?? [];
  const params = await searchParams;
  const studentParam = params.child ?? params.student;

  if (children.length === 0) {
    return (
      <EmptyState
        title="Aucun enfant rattaché"
        description="Votre compte n'est pas encore associé à un élève."
      />
    );
  }

  const selected = children.find((c) => c.id === studentParam) ?? children[0];
  const schoolId = ctx?.schoolId ?? selected.schoolId;

  return (
    <PortalPlanGate schoolId={schoolId} feature="store">
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fournitures scolaires</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl">Elima Store</h1>
            <p className="mt-1 text-sm text-slate-500">Sélectionnez les articles et passez commande.</p>
          </div>
        </div>
      </section>

      <ChildSwitcher
        childrenList={children.map((c) => ({
          student_id: c.id,
          full_name: c.fullName,
          class_id: c.classId,
          class_name: c.className,
        }))}
        selectedStudentId={selected.id}
        basePath="/parent/store"
      />

      <ParentStoreForm studentId={selected.id} />
    </div>
    </PortalPlanGate>
  );
}
