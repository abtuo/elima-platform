import { MessageCircleMore } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TeacherMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Messagerie" subtitle="Echanges avec les classes, les familles et l'administration." />
      <section className="elima-card">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <MessageCircleMore size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--accent)]">Conversations</h2>
            <p className="mt-1 text-sm text-slate-600">
              Les messages de classe et les annonces importantes seront regroupes ici.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
