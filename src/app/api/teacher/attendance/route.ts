import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

type Status = "PRESENT" | "ABSENT" | "LATE";

/**
 * Recent attendance history (daily aggregates) + today's per-student status
 * for a class, read from real attendance rows. Used by the teacher page.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json({ history: [], today: {} });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { data: userRow } = await admin
      .from("users")
      .select("id, role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow || userRow.role !== "TEACHER") {
      return NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 29);
    const fromStr = since.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: rows } = await admin
      .from("attendance")
      .select("student_id, status, reason, date")
      .eq("class_id", classId)
      .gte("date", fromStr)
      .order("date", { ascending: false })
      .range(0, 20000);

    const byDate = new Map<string, { present: number; absent: number; late: number }>();
    const today: Record<string, Status> = {};
    const todayReason: Record<string, string> = {};

    for (const r of (rows as Array<{ student_id: unknown; status: unknown; reason: unknown; date: unknown }>) ?? []) {
      const date = String(r.date);
      const status = String(r.status) as Status;
      const agg = byDate.get(date) ?? { present: 0, absent: 0, late: 0 };
      if (status === "PRESENT") agg.present += 1;
      else if (status === "ABSENT") agg.absent += 1;
      else if (status === "LATE") agg.late += 1;
      byDate.set(date, agg);

      if (date === todayStr) {
        today[String(r.student_id)] = status;
        if (r.reason) todayReason[String(r.student_id)] = String(r.reason);
      }
    }

    const history = Array.from(byDate.entries())
      .map(([dateISO, agg]) => ({ dateISO, ...agg }))
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
      .slice(0, 12);

    return NextResponse.json({ history, today, todayReason });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}

/** Persist the attendance call (one upsert per student for the given date). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      classId?: string;
      date?: string;
      statuses?: { studentId: string; status: Status; reason?: string | null }[];
    };
    const classId = body.classId;
    const dateStr = body.date || new Date().toISOString().slice(0, 10);
    const statuses = (body.statuses ?? []).filter((s) => s && s.studentId);
    if (!classId || statuses.length === 0) {
      return NextResponse.json({ message: "Classe et statuts requis." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }
    const { data: userRow } = await admin
      .from("users")
      .select("id, role, school_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!userRow || userRow.role !== "TEACHER") {
      return NextResponse.json({ message: "Profil enseignant introuvable" }, { status: 404 });
    }
    const schoolId = String((userRow as { school_id?: string | null }).school_id ?? "");

    const rows = statuses.map((s) => ({
      school_id: schoolId,
      class_id: classId,
      student_id: s.studentId,
      recorded_by: authData.user!.id,
      status: s.status,
      // Motif simple, conservé seulement pour les absences/retards.
      reason: s.status === "PRESENT" ? null : (s.reason?.trim() || null),
      date: dateStr,
    }));
    const { error: upErr } = await admin.from("attendance").upsert(rows as never, { onConflict: "student_id,date" });
    if (upErr) return NextResponse.json({ message: upErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, saved: rows.length, date: dateStr });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
