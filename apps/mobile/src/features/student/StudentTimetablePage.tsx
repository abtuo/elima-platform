import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { GeneratedFeatureIcon } from "@/components/common/GeneratedFeatureIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatSchoolDate, formatSchoolTime, schoolDateKey } from "@/lib/schoolDateTime";
import { getTimetable } from "@/services/mainDataService";
import type { TimetableEvent } from "@/types/school";

export function StudentTimetablePage() {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  useEffect(() => { getTimetable(14).then(setEvents); }, []);
  const days = useMemo(() => [...new Set(events.map((event) => schoolDateKey(event.startsAt)))], [events]);
  const subtitle = events.some((event) => event.referenceDate) ? "Semaine de démonstration" : "Mes deux prochaines semaines";

  return <PageContainer>
    <AppHeader title="Emploi du temps" subtitle={subtitle} accent="#7C3AED" action={<GeneratedFeatureIcon name="planning" className="h-14 w-14" />} />
    {days.length ? <div className="space-y-6">{days.map((day) => <section key={day}>
      <h2 className="mb-3 font-title text-lg font-semibold capitalize text-accent">{formatSchoolDate(`${day}T12:00:00.000Z`, { weekday: "long", day: "numeric", month: "long" })}</h2>
      <div className="space-y-2">{events.filter((event) => schoolDateKey(event.startsAt) === day).map((event) => <article key={event.id} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <div className="w-14 shrink-0 border-r border-gray-100 pr-3 text-center"><Clock3 className="mx-auto h-4 w-4 text-revision" /><p className="mt-1 text-sm font-bold text-accent">{formatSchoolTime(event.startsAt)}</p></div>
        <div className="min-w-0 flex-1"><p className="font-semibold text-accent">{event.eventType === "evaluation" ? event.title ?? "Évaluation" : event.subject}</p>{event.eventType === "evaluation" ? <p className="text-xs font-semibold text-amber-600">Évaluation · {event.subject}</p> : null}<p className="text-xs text-gray-500">{formatSchoolTime(event.startsAt)} – {formatSchoolTime(event.endsAt)}</p>{event.room ? <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3.5 w-3.5" />{event.room}</p> : null}</div>
      </article>)}</div>
    </section>)}</div> : <EmptyState icon={CalendarDays} title="Aucun cours planifié" description="Les cours publiés par l’établissement apparaîtront ici." />}
  </PageContainer>;
}
