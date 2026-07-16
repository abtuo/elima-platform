import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { GeneratedActionIcon } from "@/components/common/GeneratedActionIcon";
import { calendarDayDifference, formatSchoolDate, formatSchoolTime, schoolDateKey } from "@/lib/schoolDateTime";
import { enableCourseNotifications, notifyUpcomingCourses } from "@/services/notificationService";
import type { TimetableEvent } from "@/types/school";

export function TimetableCard({ events, title = "Prochains cours", maxItems = 4, emptyMessage = "Aucun cours planifié aujourd’hui ou demain." }: { events: TimetableEvent[]; title?: string; maxItems?: number; emptyMessage?: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("Notification" in window ? Notification.permission : "unsupported");
  useEffect(() => { notifyUpcomingCourses(events); }, [events, permission]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-title text-lg font-semibold text-accent">{title}</h2></div>
        {permission === "default" ? <button type="button" onClick={async () => setPermission(await enableCourseNotifications())} className="flex items-center gap-1 text-xs font-semibold text-primary"><GeneratedActionIcon name="reminder" className="h-8 w-8" />Activer les rappels</button> : null}
      </div>
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        {events.length ? events.slice(0, maxItems).map((event, index) => {
          const reference = event.referenceDate ?? schoolDateKey(new Date());
          const difference = calendarDayDifference(event.startsAt, reference);
          const dayLabel = difference === 0 ? "Aujourd’hui" : difference === 1 ? "Demain" : formatSchoolDate(event.startsAt, { weekday: "short" });
          return <div key={event.id} className={`flex items-center gap-3 p-4 ${index ? "border-t border-gray-100" : ""}`}>
            <div className="w-20 shrink-0 text-center"><p className="text-xs font-semibold uppercase text-primary">{dayLabel}</p><p className="text-sm font-bold text-accent">{formatSchoolTime(event.startsAt)}</p></div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-accent">{event.eventType === "evaluation" ? event.title ?? "Évaluation" : event.subject}</p><p className="truncate text-xs text-gray-500">{event.eventType === "evaluation" ? `Évaluation · ${event.subject} · ${event.className}` : event.className} · jusqu’à {formatSchoolTime(event.endsAt)}</p></div>
            {event.room ? <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3.5 w-3.5" />{event.room}</span> : null}
          </div>;
        }) : <p className="p-5 text-sm text-gray-500">{emptyMessage}</p>}
      </div>
    </section>
  );
}
