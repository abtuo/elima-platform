import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { getAppNow } from "@/lib/app-date";
import { resolveTeacher } from "@/lib/teacher/server";
import { notifyClassAudienceThread } from "@/lib/messaging/create";

type Relation<T> = T | T[] | null | undefined;

type TimetableEventRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  status?: string | null;
  original_starts_at?: string | null;
  original_ends_at?: string | null;
  change_reason?: string | null;
  change_message?: string | null;
  class?: Relation<{ id?: string; name?: string; level?: string; academic_year?: string }>;
  subject?: Relation<{ id?: string; name?: string }>;
};

type SessionStatus = "upcoming" | "in_progress" | "completed" | "call_done" | "cancelled" | "moved";

function pickOne<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
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

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDateOrFallback(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function sessionStatus(dbStatus: string | null | undefined, startsAt: string, endsAt: string, callDone: boolean, now: Date): SessionStatus {
  if (dbStatus === "cancelled") return "cancelled";
  if (dbStatus === "moved") return "moved";
  if (callDone) return "call_done";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now < start) return "upcoming";
  if (now <= end) return "in_progress";
  return "completed";
}

function formatCourseDateTime(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const startTime = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const endTime = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${date}, ${startTime}-${endTime}`;
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00.000Z`);
}

function buildScheduleMessage(params: {
  action: "cancel" | "move";
  subjectName: string;
  className: string;
  previousStartsAt: string;
  previousEndsAt: string;
  nextStartsAt?: string;
  nextEndsAt?: string;
  customMessage?: string | null;
}) {
  const previous = formatCourseDateTime(params.previousStartsAt, params.previousEndsAt);
  const custom = params.customMessage?.trim();
  if (params.action === "cancel") {
    return [
      `Le cours de ${params.subjectName} (${params.className}) prevu ${previous} est annule.`,
      custom ? `Message de l'enseignant : ${custom}` : null,
    ].filter(Boolean).join("\n");
  }

  const next = params.nextStartsAt && params.nextEndsAt ? formatCourseDateTime(params.nextStartsAt, params.nextEndsAt) : "";
  return [
    `Le cours de ${params.subjectName} (${params.className}) prevu ${previous} est deplace.`,
    next ? `Nouveau creneau : ${next}.` : null,
    custom ? `Message de l'enseignant : ${custom}` : null,
  ].filter(Boolean).join("\n");
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    if (!ctx.teacherId) return NextResponse.json({ message: "Enseignant non configure" }, { status: 403 });

    const url = new URL(request.url);
    const now = getAppNow();
    const fallbackFrom = startOfDay(now);
    const fallbackTo = endOfDay(now);
    const from = toDateOrFallback(url.searchParams.get("from"), fallbackFrom);
    const to = toDateOrFallback(url.searchParams.get("to"), fallbackTo);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");

    const admin = await createSupabaseAdminServerClient();
    let query = admin
      .from("timetable_events")
      .select(
        `id, class_id, teacher_id, subject_id, starts_at, ends_at, room,
         status, original_starts_at, original_ends_at, change_reason, change_message,
         class:classes!timetable_events_class_id_fkey(id, name, level, academic_year),
         subject:subjects!timetable_events_subject_id_fkey(id, name)`,
      )
      .eq("school_id", ctx.schoolId)
      .eq("teacher_id", ctx.teacherId)
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .order("starts_at", { ascending: true });

    if (classId && classId !== "all") query = query.eq("class_id", classId);
    if (subjectId && subjectId !== "all") query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    const rows = ((data ?? []) as unknown as TimetableEventRow[]).filter((row) => row.starts_at && row.ends_at);
    const dates = Array.from(new Set(rows.map((row) => row.starts_at.slice(0, 10))));
    const classIds = Array.from(new Set(rows.map((row) => row.class_id)));

    let attendanceKeys = new Set<string>();
    if (dates.length > 0 && classIds.length > 0) {
      const { data: attendanceRows, error: attendanceErr } = await admin
        .from("attendance")
        .select("class_id, date")
        .eq("school_id", ctx.schoolId)
        .in("class_id", classIds)
        .in("date", dates);
      if (attendanceErr) return NextResponse.json({ message: attendanceErr.message }, { status: 400 });
      attendanceKeys = new Set(
        ((attendanceRows ?? []) as Array<{ class_id: string; date: string }>).map((row) => `${row.class_id}:${row.date}`),
      );
    }

    const sessions = rows.map((row) => {
      const classRow = pickOne(row.class);
      const subjectRow = pickOne(row.subject);
      const date = row.starts_at.slice(0, 10);
      const callDone = attendanceKeys.has(`${row.class_id}:${date}`);
      return {
        id: row.id,
        classId: row.class_id,
        className: String(classRow?.name ?? "Classe"),
        classLevel: classRow?.level ? String(classRow.level) : null,
        academicYear: classRow?.academic_year ? String(classRow.academic_year) : null,
        subjectId: row.subject_id,
        subjectName: String(subjectRow?.name ?? "Matiere"),
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        date,
        room: row.room ? String(row.room) : null,
        timetableStatus: row.status ?? "scheduled",
        originalStartsAt: row.original_starts_at,
        originalEndsAt: row.original_ends_at,
        changeReason: row.change_reason,
        changeMessage: row.change_message,
        callDone,
        status: sessionStatus(row.status, row.starts_at, row.ends_at, callDone, now),
      };
    });

    const today = isoDate(now);
    const todaySessions = sessions.filter((session) => session.date === today);
    const nextSession = sessions.find((session) => new Date(session.endsAt) >= now) ?? null;

    return NextResponse.json({
      now: now.toISOString(),
      range: { from: from.toISOString(), to: to.toISOString() },
      sessions,
      summary: {
        totalToday: todaySessions.length,
        callsToDo: todaySessions.filter((session) => !session.callDone).length,
        nextSession,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          id?: string;
          action?: "cancel" | "move";
          date?: string;
          startTime?: string;
          endTime?: string;
          message?: string | null;
        }
      | null;

    const id = body?.id?.trim();
    const action = body?.action;
    const customMessage = body?.message?.trim() || null;
    if (!id || (action !== "cancel" && action !== "move")) {
      return NextResponse.json({ message: "Cours et action requis." }, { status: 400 });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;
    if (!ctx.teacherId) return NextResponse.json({ message: "Enseignant non configure" }, { status: 403 });

    const admin = await createSupabaseAdminServerClient();
    const { data: eventRow, error: eventErr } = await admin
      .from("timetable_events")
      .select(
        `id, school_id, class_id, teacher_id, subject_id, starts_at, ends_at, room, status, original_starts_at, original_ends_at,
         class:classes!timetable_events_class_id_fkey(name),
         subject:subjects!timetable_events_subject_id_fkey(name)`,
      )
      .eq("id", id)
      .eq("school_id", ctx.schoolId)
      .eq("teacher_id", ctx.teacherId)
      .maybeSingle();
    if (eventErr) return NextResponse.json({ message: eventErr.message }, { status: 400 });
    if (!eventRow) return NextResponse.json({ message: "Cours introuvable" }, { status: 404 });

    const current = eventRow as TimetableEventRow & { school_id: string };
    const previousStartsAt = current.starts_at;
    const previousEndsAt = current.ends_at;
    const classRow = pickOne(current.class);
    const subjectRow = pickOne(current.subject);
    const className = String(classRow?.name ?? "Classe");
    const subjectName = String(subjectRow?.name ?? "Cours");
    const changedAt = getAppNow().toISOString();

    let nextStartsAt = previousStartsAt;
    let nextEndsAt = previousEndsAt;
    const update: Record<string, unknown> = {
      original_starts_at: current.original_starts_at ?? previousStartsAt,
      original_ends_at: current.original_ends_at ?? previousEndsAt,
      change_message: customMessage,
      changed_at: changedAt,
      changed_by: ctx.userId,
    };

    if (action === "cancel") {
      update.status = "cancelled";
      update.cancelled_at = changedAt;
      update.change_reason = "cancelled";
    } else {
      const date = body?.date?.trim();
      const startTime = body?.startTime?.trim();
      const endTime = body?.endTime?.trim();
      if (!date || !startTime || !endTime) {
        return NextResponse.json({ message: "Date, heure de debut et heure de fin requises." }, { status: 400 });
      }
      const start = toDateTime(date, startTime);
      const end = toDateTime(date, endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return NextResponse.json({ message: "Nouveau creneau invalide." }, { status: 400 });
      }
      nextStartsAt = start.toISOString();
      nextEndsAt = end.toISOString();
      update.status = "moved";
      update.starts_at = nextStartsAt;
      update.ends_at = nextEndsAt;
      update.cancelled_at = null;
      update.change_reason = "moved";
    }

    const { error: updateErr } = await admin.from("timetable_events").update(update as never).eq("id", id);
    if (updateErr) return NextResponse.json({ message: updateErr.message }, { status: 400 });

    const content = buildScheduleMessage({
      action,
      subjectName,
      className,
      previousStartsAt,
      previousEndsAt,
      nextStartsAt,
      nextEndsAt,
      customMessage,
    });

    await notifyClassAudienceThread(admin, {
      schoolId: ctx.schoolId,
      classId: current.class_id,
      type: "schedule_update",
      title: `Emploi du temps - ${className}`,
      extraParticipantUserIds: [ctx.userId],
      messages: [
        {
          senderId: ctx.userId,
          senderRole: "TEACHER",
          content,
          type: action === "cancel" ? "course_cancelled" : "course_moved",
          metadata: { timetableEventId: id, action },
        },
      ],
    });

    return NextResponse.json({ ok: true, id, action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
