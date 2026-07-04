import { MessageCircleMore } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default function ParentMessagesPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <MessageCircleMore size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espace Parent</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl">Messagerie</h1>
            <p className="mt-1 text-sm text-slate-500">Messages importants de l&apos;ecole et echanges avec l&apos;administration.</p>
          </div>
        </div>
      </section>
      <EmptyState title="Aucun message" description="Les messages de l&apos;ecole apparaitront ici." />
    </div>
  );
}
