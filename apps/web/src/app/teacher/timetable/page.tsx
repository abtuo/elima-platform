"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, CalendarDays, ClipboardCheck, MessageCircleMore, NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { useToast } from "@/components/ui/Toast";
import { getAppNow } from "@/lib/app-date";
import { useTeacherContext } from "../TeacherContext";

type Period = "day" | "week" | "agenda";

type TimetableSession = {
  id: string;
  classId: string;
  className: string;
  classLevel: string | null;
  academicYear: string | null;
  subjectId: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  date: string;
  room: string | null;
  timetableStatus: string;
  originalStartsAt: string | null;
  originalEndsAt: string | null;
  changeReason: string | null;
  changeMessage: string | null;
  callDone: boolean;
  status: "upcoming" | "in_progress" | "completed" | "call_done" | "cancelled" | "moved";
};

type TimetableResponse = {
  now: string;
  sessions: TimetableSession[];
  summary: {
    totalToday: number;
    callsToDo: number;
    nextSession: TimetableSession | null;
  };
};

const STATUS_LABELS: Record<TimetableSession["status"], string> = {
  upcoming: "A venir",
  in_progress: "En cours",
  completed: "Termine",
  call_done: "Appel fait",
  cancelled: "Annule",
  moved: "Deplace",
};

const STATUS_STYLES: Record<TimetableSession["status"], string> = {
  upcoming: "bg-slate-100 text-slate-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-200 text-slate-600",
  call_done: "bg-[var(--primary)]/10 text-[var(--primary)]",
  cancelled: "bg-rose-100 text-rose-700",
  moved: "bg-cyan-100 text-cyan-700",
};

const PERIOD_LABELS: Record<Period, string> = {
  day: "Jour",
  week: "Semaine",
  agenda: "Agenda",
};

const EMPTY_SESSIONS: TimetableSession[] = [];

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseInputDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? getAppNow() : date;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function rangeFor(period: Period, selectedDate: string) {
  const selected = parseInputDate(selectedDate);
  if (period === "week") {
    const from = startOfWeek(selected);
    return { from, to: endOfDay(addDays(from, 5)) };
  }
  if (period === "agenda") {
    return { from: startOfDay(selected), to: endOfDay(addDays(selected, 30)) };
  }
  return { from: startOfDay(selected), to: endOfDay(selected) };
}

function timeLabel(session: TimetableSession) {
  const start = new Date(session.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const end = new Date(session.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${start}-${end}`;
}

function longDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function SessionActions({
  session,
  onCancel,
  onMove,
}: {
  session: TimetableSession;
  onCancel: (session: TimetableSession) => void;
  onMove: (session: TimetableSession) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/teacher/attendance"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <ClipboardCheck size={13} />
        Faire l&apos;appel
      </Link>
      {session.status !== "cancelled" ? (
        <>
          <button
            type="button"
            onClick={() => onMove(session)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
          >
            Deplacer
          </button>
          <button
            type="button"
            onClick={() => onCancel(session)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Annuler
          </button>
        </>
      ) : null}
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <NotebookPen size={13} />
        Cahier de textes
      </Link>
      <Link
        href="/teacher/homework"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <BookMarked size={13} />
        Devoir
      </Link>
      <Link
        href={`/teacher/messages?class=${encodeURIComponent(session.classId)}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <MessageCircleMore size={13} />
        Message classe
      </Link>
    </div>
  );
}

function SessionCard({
  session,
  compact = false,
  onCancel,
  onMove,
}: {
  session: TimetableSession;
  compact?: boolean;
  onCancel: (session: TimetableSession) => void;
  onMove: (session: TimetableSession) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{timeLabel(session)}</p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">{session.subjectName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {session.className}
            {session.room ? ` - ${session.room}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[session.status]}`}>
          {STATUS_LABELS[session.status]}
        </span>
      </div>
      {compact ? null : (
        <div className="mt-3">
          <SessionActions session={session} onCancel={onCancel} onMove={onMove} />
        </div>
      )}
    </article>
  );
}

function defaultMoveDate(session: TimetableSession) {
  return session.startsAt.slice(0, 10);
}

function defaultMoveTime(value: string) {
  return new Date(value).toISOString().slice(11, 16);
}

export default function TeacherTimetablePage() {
  const { classes, subjects, assignments, loading: contextLoading } = useTeacherContext();
  const { success } = useToast();
  const [period, setPeriod] = useState<Period>("day");
  const [classId, setClassId] = useState("all");
  const [subjectId, setSubjectId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => toInputDate(getAppNow()));
  const [data, setData] = useState<TimetableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<{ action: "cancel" | "move"; session: TimetableSession } | null>(null);
  const [moveDate, setMoveDate] = useState("");
  const [moveStart, setMoveStart] = useState("");
  const [moveEnd, setMoveEnd] = useState("");
  const [message, setMessage] = useState("");
  const [savingChange, setSavingChange] = useState(false);

  const availableSubjects = useMemo(() => {
    if (classId === "all") return subjects;
    const subjectIds = new Set(assignments.filter((item) => item.classId === classId).map((item) => item.subjectId));
    return subjects.filter((subject) => subjectIds.has(subject.id));
  }, [assignments, classId, subjects]);

  const { from, to } = useMemo(() => rangeFor(period, selectedDate), [period, selectedDate]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      classId,
      subjectId,
    });
    const id = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      fetch(`/api/teacher/timetable?${params.toString()}`)
        .then(async (response) => {
          const body = (await response.json().catch(() => null)) as TimetableResponse | { message?: string } | null;
          if (!response.ok) throw new Error((body as { message?: string } | null)?.message ?? "Chargement impossible.");
          return body as TimetableResponse;
        })
        .then((body) => {
          if (!active) return;
          setData(body);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Chargement impossible.");
          setData(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, [classId, from, refreshKey, subjectId, to]);

  const sessions = data?.sessions ?? EMPTY_SESSIONS;
  const daySessions = sessions.filter((session) => session.date === selectedDate);
  const weekStart = startOfWeek(parseInputDate(selectedDate));
  const weekDays = Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TimetableSession[]>();
    sessions.forEach((session) => {
      const list = map.get(session.date) ?? [];
      list.push(session);
      map.set(session.date, list);
    });
    return map;
  }, [sessions]);

  const nextSession = data?.summary.nextSession ?? null;
  const headerDate =
    period === "week"
      ? `Semaine du ${shortDate(toInputDate(weekStart))}`
      : period === "agenda"
        ? `A partir du ${shortDate(selectedDate)}`
        : longDate(selectedDate);

  function openCancel(session: TimetableSession) {
    setEditing({ action: "cancel", session });
    setMoveDate(defaultMoveDate(session));
    setMoveStart(defaultMoveTime(session.startsAt));
    setMoveEnd(defaultMoveTime(session.endsAt));
    setMessage("");
  }

  function openMove(session: TimetableSession) {
    setEditing({ action: "move", session });
    setMoveDate(defaultMoveDate(session));
    setMoveStart(defaultMoveTime(session.startsAt));
    setMoveEnd(defaultMoveTime(session.endsAt));
    setMessage("");
  }

  async function saveCourseChange() {
    if (!editing) return;
    setSavingChange(true);
    try {
      const res = await fetch("/api/teacher/timetable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.session.id,
          action: editing.action,
          date: editing.action === "move" ? moveDate : undefined,
          startTime: editing.action === "move" ? moveStart : undefined,
          endTime: editing.action === "move" ? moveEnd : undefined,
          message: message.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(body?.message ?? "Modification impossible.");
      success(
        editing.action === "cancel" ? "Cours annule" : "Cours deplace",
        "Un message a ete envoye a la classe et aux parents.",
      );
      setEditing(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      success("Echec", err instanceof Error ? err.message : "Veuillez reessayer.");
    } finally {
      setSavingChange(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Calendrier enseignant</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--accent)]">Emploi du temps</h1>
            <p className="mt-1 text-sm text-slate-600">Agenda de vos cours, appels rapides et evenements pedagogiques.</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{headerDate}</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Classe
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setSubjectId("all");
                }}
                disabled={contextLoading || classes.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              >
                <option value="all">Toutes mes classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Matiere
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                disabled={contextLoading || availableSubjects.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              >
                <option value="all">Toutes les matieres</option>
                {availableSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={
                period === item
                  ? "rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              }
            >
              {PERIOD_LABELS[item]}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Cours aujourd'hui" value={data?.summary.totalToday ?? 0} icon={<CalendarDays size={20} />} />
        <StatCard
          title="Appels a faire"
          value={data?.summary.callsToDo ?? 0}
          icon={<ClipboardCheck size={20} />}
          status={(data?.summary.callsToDo ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Prochain cours"
          value={nextSession ? timeLabel(nextSession) : "-"}
          trendLabel={nextSession ? `${nextSession.subjectName} - ${nextSession.className}` : "Aucun cours a venir"}
          icon={<BookMarked size={20} />}
        />
        <StatCard title="Cours periode" value={sessions.length} icon={<NotebookPen size={20} />} />
      </section>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">Chargement de la page emploi du temps...</p> : null}

      {period === "day" ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-base font-semibold text-slate-900">Vue jour</h2>
          <div className="mt-4 space-y-3">
            {daySessions.length === 0 ? (
              <EmptyState title="Aucun cours prevu sur cette periode." />
            ) : (
              daySessions.map((session) => <SessionCard key={session.id} session={session} onCancel={openCancel} onMove={openMove} />)
            )}
          </div>
        </section>
      ) : null}

      {period === "week" ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-base font-semibold text-slate-900">Vue semaine</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-6">
            {weekDays.map((day) => {
              const date = toInputDate(day);
              const items = sessionsByDate.get(date) ?? [];
              return (
                <div key={date} className="min-h-40 rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">{shortDate(date)}</p>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-400">Aucun cours</p>
                    ) : (
                      items.map((session) => <SessionCard key={session.id} session={session} compact onCancel={openCancel} onMove={openMove} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {period === "agenda" ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-base font-semibold text-slate-900">Vue agenda</h2>
          <div className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <EmptyState title="Aucun cours prevu sur cette periode." />
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[150px_1fr]">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{shortDate(session.date)}</p>
                    <p className="text-xs text-slate-500">{timeLabel(session)}</p>
                  </div>
                  <SessionCard session={session} onCancel={openCancel} onMove={openMove} />
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing.action === "cancel" ? "Annuler le cours" : "Deplacer le cours"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editing.session.subjectName} - {editing.session.className} - {timeLabel(editing.session)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            {editing.action === "move" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Nouvelle date
                  <input
                    type="date"
                    value={moveDate}
                    onChange={(event) => setMoveDate(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Debut
                  <input
                    type="time"
                    value={moveStart}
                    onChange={(event) => setMoveStart(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Fin
                  <input
                    type="time"
                    value={moveEnd}
                    onChange={(event) => setMoveEnd(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ) : null}

            <label className="mt-4 flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Message aux eleves et parents
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="Optionnel. Exemple : je suis en voyage, merci de revoir les exercices donnes."
                className="resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
              />
            </label>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingChange}
                onClick={() => void saveCourseChange()}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {savingChange ? "Envoi..." : editing.action === "cancel" ? "Confirmer l'annulation" : "Confirmer le deplacement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
