import { MessageCircleMore } from "lucide-react";

export default async function ParentMessagesPage() {
  return (
    <div className="space-y-6">
      <div className="elima-card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--accent)]">Messages</h1>
          <MessageCircleMore size={18} className="text-[var(--primary)]" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Centre de messages (démo) : notifications, informations de l’école, communications.
        </p>
      </div>

      <section className="elima-card space-y-3">
        {["Bulletin publié : Trimestre 1", "Absence détectée : 20/02", "Rappel : réunion parents"].map((m) => (
          <div key={m} className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="font-semibold">{m}</p>
            <p className="mt-1 text-xs text-slate-500">Aujourd’hui</p>
          </div>
        ))}
      </section>
    </div>
  );
}
