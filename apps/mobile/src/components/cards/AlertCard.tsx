import { Bell, CalendarClock, CreditCard, GraduationCap, Trash2, UserX } from "lucide-react";
import type { MessagePreview } from "@/types/school";
import { ElimaCard } from "@/components/common/ElimaCard";

const icons = {
  absence_notification: UserX,
  grade_notification: GraduationCap,
  payment_reminder: CreditCard,
  schedule_update: CalendarClock,
};

export function AlertCard({ alert, onDelete }: { alert: MessagePreview; onDelete: (conversationId: string) => Promise<void> }) {
  const Icon = icons[alert.conversationType as keyof typeof icons] ?? Bell;
  async function remove() {
    if (!window.confirm("Supprimer cette alerte de votre liste ?")) return;
    await onDelete(alert.conversationId);
  }
  return <ElimaCard><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className={`font-title truncate text-base font-semibold ${alert.read ? "text-gray-600" : "text-accent"}`}>{alert.subject}</h3>{!alert.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" /> : null}</div><p className="mt-1 text-sm text-gray-500">{alert.preview}</p><p className="mt-2 text-xs text-gray-400">{alert.date}</p></div><button type="button" onClick={remove} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer l’alerte"><Trash2 className="h-4 w-4" /></button></div></ElimaCard>;
}
