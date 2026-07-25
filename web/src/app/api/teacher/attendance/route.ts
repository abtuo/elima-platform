import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { assertTeacherAssignment, resolveTeacher } from "@/lib/teacher/server";
import { getAppNow } from "@/lib/app-date";
import { notifyStudentThread, recordInternalNotification } from "@/lib/messaging/create";

type Status = "PRESENT" | "ABSENT" | "LATE";

/** Recent attendance history + today's per-student status for a teacher class. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ history: [], today: {}, todayReason: {} });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId);
    if (assignmentError) return assignmentError;

    const since = getAppNow();
    since.setDate(since.getDate() - 29);
    const fromStr = since.toISOString().slice(0, 10);
    const todayStr = getAppNow().toISOString().slice(0, 10);

    const { data: rows, error } = await admin
      .from("attendance")
      .select("student_id, status, reason, date")
      .eq("school_id", ctx.schoolId)
      .eq("class_id", classId)
      .gte("date", fromStr)
      .order("date", { ascending: false })
      .range(0, 20000);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    const byDate = new Map<string, { present: number; absent: number; late: number }>();
    const today: Record<string, Status> = {};
    const todayReason: Record<string, string> = {};

    for (const r of (rows as Array<{ student_id: unknown; status: unknown; reason: unknown; date: unknown }>) ?? []) {
      const date = String(r.date);
      const status = String(r.status) as Status;
      const aggregate = byDate.get(date) ?? { present: 0, absent: 0, late: 0 };
      if (status === "PRESENT") aggregate.present += 1;
      else if (status === "ABSENT") aggregate.absent += 1;
      else if (status === "LATE") aggregate.late += 1;
      byDate.set(date, aggregate);

      if (date === todayStr) {
        today[String(r.student_id)] = status;
        if (r.reason) todayReason[String(r.student_id)] = String(r.reason);
      }
    }

    const history = Array.from(byDate.entries())
      .map(([dateISO, aggregate]) => ({ dateISO, ...aggregate }))
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .slice(0, 12);

    return NextResponse.json({ history, today, todayReason });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Persist the attendance call, one upsert per student for the given date. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      classId?: string;
      date?: string;
      statuses?: { studentId: string; status: Status; reason?: string | null }[];
    };

    const classId = body.classId;
    const dateStr = body.date || getAppNow().toISOString().slice(0, 10);
    const statuses = (body.statuses ?? []).filter((s) => s?.studentId);
    if (!classId || statuses.length === 0) {
      return NextResponse.json({ message: "Classe et statuts requis." }, { status: 400 });
    }

    const ctx = await resolveTeacher();
    if ("error" in ctx) return ctx.error;

    const admin = await createSupabaseAdminServerClient();
    const assignmentError = await assertTeacherAssignment(admin, ctx, classId);
    if (assignmentError) return assignmentError;

    const studentIds = statuses.map((s) => s.studentId);
    const { data: allowedStudents, error: studentsErr } = await admin
      .from("students")
      .select("id")
      .eq("school_id", ctx.schoolId)
      .eq("class_id", classId)
      .in("id", studentIds);
    if (studentsErr) return NextResponse.json({ message: studentsErr.message }, { status: 400 });
    const allowed = new Set(((allowedStudents as Array<{ id: string }>) ?? []).map((s) => String(s.id)));

    const rows = statuses
      .filter((s) => allowed.has(s.studentId))
      .map((s) => ({
        school_id: ctx.schoolId,
        class_id: classId,
        student_id: s.studentId,
        recorded_by: ctx.userId,
        status: s.status,
        reason: s.status === "PRESENT" ? null : (s.reason?.trim() || null),
        date: dateStr,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ message: "Aucun eleve valide pour cette classe." }, { status: 400 });
    }

    const { error: upsertErr } = await admin.from("attendance").upsert(rows as never, { onConflict: "student_id,date" });
    if (upsertErr) return NextResponse.json({ message: upsertErr.message }, { status: 400 });

    const todayStr = getAppNow().toISOString().slice(0, 10);
    let notificationsSent = 0;
    const toNotify = dateStr === todayStr ? rows.filter((r) => r.status === "ABSENT" || r.status === "LATE") : [];

    if (toNotify.length > 0) {
      const studentIds = toNotify.map((r) => String(r.student_id));
      const { data: studentRows } = await admin
        .from("students")
        .select("id, full_name")
        .eq("school_id", ctx.schoolId)
        .in("id", studentIds);
      const nameById = new Map(
        ((studentRows ?? []) as Array<{ id: string; full_name: string }>).map((s) => [String(s.id), String(s.full_name)]),
      );

      for (const row of toNotify) {
        const studentId = String(row.student_id);
        const fullName = nameById.get(studentId) ?? "Élève";
        const firstName = fullName.split(/\s+/)[0] ?? fullName;
        const isAbsent = row.status === "ABSENT";
        const reasonSuffix = row.reason ? ` Motif : ${row.reason}.` : "";
        const systemText = isAbsent
          ? `Absence signalée : ${fullName} est absent(e) aujourd'hui.${reasonSuffix} Merci de transmettre un justificatif.`
          : `Retard signalé : ${fullName} est en retard aujourd'hui.${reasonSuffix}`;
        const title = isAbsent ? `Absence de ${fullName}` : `Retard de ${fullName}`;

        await notifyStudentThread(admin, {
          schoolId: ctx.schoolId,
          studentId,
          classId,
          type: "absence_notification",
          title,
          extraParticipantUserIds: [ctx.userId],
          messages: [
            { senderId: null, senderRole: "SYSTEM", content: systemText, type: "absence_alert" },
            {
              senderId: ctx.userId,
              senderRole: "TEACHER",
              content: isAbsent
                ? `Bonjour, ${firstName} n'est pas présent(e) en classe ce matin. Pouvez-vous nous confirmer si tout va bien ?`
                : `Bonjour, ${firstName} est arrivé(e) en retard ce matin. Merci de nous tenir informés en cas de récidive.`,
            },
          ],
        });

        await recordInternalNotification(admin, {
          schoolId: ctx.schoolId,
          studentId,
          type: isAbsent ? "ABSENCE_ALERT" : "LATE_ALERT",
          message: systemText,
        });
        notificationsSent += 1;
      }
    }

    return NextResponse.json({ ok: true, saved: rows.length, date: dateStr, notificationsSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
