import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { getTimetable } from "@/services/mainDataService";
import type { TimetableEvent } from "@/types/school";

export function StudentTimetablePage() {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  useEffect(() => { getTimetable(14).then(setEvents); }, []);
  const days = useMemo(() => [...new Set(events.map((event) => new Date(event.startsAt).toISOString().slice(0, 10)))], [events]);
  return <PageContainer><AppHeader title="Emploi du temps" subtitle="Mes deux prochaines semaines" accent="#7C3AED" />{days.length ? <div className="space-y-6">{days.map((day) => <section key={day}><h2 className="mb-3 font-title text-lg font-semibold capitalize text-accent">{new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</h2><div className="space-y-2">{events.filter((event) => event.startsAt.slice(0, 10) === day).map((event) => { const start = new Date(event.startsAt); const end = new Date(event.endsAt); return <article key={event.id} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm"><div className="w-14 shrink-0 border-r border-gray-100 pr-3 text-center"><Clock3 className="mx-auto h-4 w-4 text-revision" /><p className="mt-1 text-sm font-bold text-accent">{start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="min-w-0 flex-1"><p className="font-semibold text-accent">{event.subject}</p><p className="text-xs text-gray-500">{start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>{event.room ? <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3.5 w-3.5" />{event.room}</p> : null}</div></article>; })}</div></section>)}</div> : <EmptyState icon={CalendarDays} title="Aucun cours planifié" description="Les cours publiés par l’établissement apparaîtront ici." />}</PageContainer>;
}
