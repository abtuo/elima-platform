import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getStudentBalance, type StudentBalance } from "@/lib/finance/queries";
import type { AppRole } from "@/lib/types";

export type AccessibleStudent = {
  id: string;
  fullName: string;
  classId: string;
  className: string;
  schoolId: string;
};

export type PortalContext = {
  userId: string;
  role: AppRole | null;
  schoolId: string | null;
  fullName: string | null;
  students: AccessibleStudent[];
};

export type SubjectAverage = {
  subject: string;
  coefficient: number;
  average: number; // /20
  count: number;
};

export type StudentAcademics = {
  generalAverage: number | null;
  subjects: SubjectAverage[];
  recentGrades: {
    id: string;
    score: number;
    maxScore: number;
    title: string;
    subject: string;
    date: string;
  }[];
};

export type AttendanceSummary = {
  rate: number;
  present: number;
  absent: number;
  late: number;
  recent: { date: string; status: string; reason: string | null }[];
};

function pickOne<T>(v: T[] | T | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** Resolve the authenticated parent/student and the students they can access. */
export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user?.id) return null;
  const userId = authData.user.id;

  const { data: userRow } = await admin
    .from("users")
    .select("role, school_id, full_name")
    .eq("id", userId)
    .maybeSingle();
  const role = (userRow as { role?: AppRole } | null)?.role ?? null;
  const schoolId = (userRow as { school_id?: string | null } | null)?.school_id ?? null;
  const fullName = (userRow as { full_name?: string | null } | null)?.full_name ?? null;

  let studentIds: string[] = [];
  if (role === "STUDENT") {
    const { data } = await admin.from("students").select("id").eq("user_id", userId);
    studentIds = ((data ?? []) as Array<{ id: string }>).map((s) => String(s.id));
  } else if (role === "PARENT") {
    const { data: parentRows } = await admin.from("parents").select("id").eq("user_id", userId);
    const parentIds = ((parentRows ?? []) as Array<{ id: string }>).map((p) => String(p.id));
    if (parentIds.length > 0) {
      const { data: links } = await admin
        .from("student_parents")
        .select("student_id")
        .in("parent_id", parentIds);
      studentIds = ((links ?? []) as Array<{ student_id: string }>).map((l) => String(l.student_id));
    }
  }

  let students: AccessibleStudent[] = [];
  if (studentIds.length > 0) {
    const { data: studentRows } = await admin
      .from("students")
      .select("id, full_name, class_id, school_id, class:classes!students_class_id_fkey(name)")
      .in("id", studentIds);
    students = ((studentRows ?? []) as Array<{ id: string; full_name: string; class_id: string; school_id: string; class: Array<{ name: string }> | null }>).map(
      (s) => ({
        id: String(s.id),
        fullName: String(s.full_name),
        classId: String(s.class_id),
        className: String(pickOne(s.class)?.name ?? ""),
        schoolId: String(s.school_id),
      }),
    );
  }

  return { userId, role, schoolId, fullName, students };
}

/** Ensure the current portal user may access the given student id. */
export async function assertStudentAccess(studentId: string): Promise<AccessibleStudent | null> {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  return ctx.students.find((s) => s.id === studentId) ?? null;
}

export async function getStudentAcademics(studentId: string): Promise<StudentAcademics> {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("grades")
    .select(
      `id, score, created_at,
       evaluation:evaluations!grades_evaluation_id_fkey(
         title, evaluation_date, max_score,
         subject:subjects!evaluations_subject_id_fkey(name, coefficient)
       )`,
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(0, 2000);

  type Row = {
    id: string;
    score: number;
    evaluation: {
      title: string;
      evaluation_date: string;
      max_score: number;
      subject: { name: string; coefficient: number } | { name: string; coefficient: number }[] | null;
    } | null;
  };

  const rows = ((data as unknown as Row[]) ?? []).map((r) => {
    const evaluation = pickOne(r.evaluation as Row["evaluation"][] | Row["evaluation"]);
    const subject = evaluation ? pickOne(evaluation.subject) : null;
    const maxScore = Number(evaluation?.max_score ?? 20) || 20;
    return {
      id: String(r.id),
      score: Number(r.score),
      maxScore,
      score20: (Number(r.score) / maxScore) * 20,
      title: String(evaluation?.title ?? "—"),
      subject: String(subject?.name ?? "—"),
      coefficient: Number(subject?.coefficient ?? 1),
      date: String(evaluation?.evaluation_date ?? ""),
    };
  });

  const bySubject = new Map<string, { sum: number; n: number; coeff: number }>();
  for (const r of rows) {
    const cur = bySubject.get(r.subject) ?? { sum: 0, n: 0, coeff: r.coefficient };
    cur.sum += r.score20;
    cur.n += 1;
    cur.coeff = r.coefficient;
    bySubject.set(r.subject, cur);
  }

  const subjects: SubjectAverage[] = Array.from(bySubject.entries())
    .map(([subject, v]) => ({
      subject,
      coefficient: v.coeff,
      average: Math.round((v.sum / Math.max(1, v.n)) * 100) / 100,
      count: v.n,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "fr"));

  let weightSum = 0;
  let weighted = 0;
  for (const s of subjects) {
    weightSum += s.coefficient;
    weighted += s.average * s.coefficient;
  }
  const generalAverage = weightSum > 0 ? Math.round((weighted / weightSum) * 100) / 100 : null;

  return {
    generalAverage,
    subjects,
    recentGrades: rows.slice(0, 15).map((r) => ({
      id: r.id,
      score: r.score,
      maxScore: r.maxScore,
      title: r.title,
      subject: r.subject,
      date: r.date,
    })),
  };
}

export async function getAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("attendance")
    .select("date, status, reason")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .range(0, 400);

  const rows = ((data ?? []) as Array<{ date: string; status: string; reason: string | null }>);
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const r of rows) {
    if (r.status === "PRESENT") present += 1;
    else if (r.status === "ABSENT") absent += 1;
    else if (r.status === "LATE") late += 1;
  }
  const total = rows.length;
  const rate = total ? Math.round((present / total) * 1000) / 10 : 100;
  return {
    rate,
    present,
    absent,
    late,
    recent: rows.slice(0, 15).map((r) => ({ date: r.date, status: r.status, reason: r.reason })),
  };
}

export async function getStudentHomeworks(classId: string) {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("homeworks")
    .select("id, title, description, due_date, resource_url, subject:subjects!homeworks_subject_id_fkey(name)")
    .eq("class_id", classId)
    .order("due_date", { ascending: false })
    .limit(50);
  return ((data ?? []) as Array<{ id: string; title: string; description: string | null; due_date: string; resource_url: string | null; subject: Array<{ name: string }> | null }>).map(
    (h) => ({
      id: String(h.id),
      title: String(h.title),
      description: h.description ? String(h.description) : null,
      dueDate: String(h.due_date),
      resourceUrl: h.resource_url ? String(h.resource_url) : null,
      subject: String(pickOne(h.subject)?.name ?? ""),
    }),
  );
}

export async function getStudentTimetable(classId: string) {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("timetable_events")
    .select(
      `id, starts_at, ends_at, room,
       subject:subjects!timetable_events_subject_id_fkey(name)`,
    )
    .eq("class_id", classId)
    .order("starts_at", { ascending: true })
    .limit(100);
  return ((data ?? []) as Array<{ id: string; starts_at: string; ends_at: string; room: string | null; subject: Array<{ name: string }> | null }>).map(
    (e) => ({
      id: String(e.id),
      startsAt: String(e.starts_at),
      endsAt: String(e.ends_at),
      room: e.room ? String(e.room) : null,
      subject: String(pickOne(e.subject)?.name ?? ""),
    }),
  );
}

export async function getStudentReports(studentId: string) {
  const admin = await createSupabaseAdminServerClient();
  const { data } = await admin
    .from("reports")
    .select("id, term, average_score, attendance_rate, created_at, pdf_url")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Array<{
    id: string;
    term: string;
    average_score: number;
    attendance_rate: number;
    created_at: string;
    pdf_url: string | null;
  }>;
}

export async function getStudentFinance(
  schoolId: string,
  studentId: string,
): Promise<{ balance: StudentBalance; payments: { id: string; amount: number; method: string; status: string; paidAt: string | null; receiptNo: string | null }[]; currency: string }> {
  const admin = await createSupabaseAdminServerClient();
  const [balance, paymentsRes, schoolRes] = await Promise.all([
    getStudentBalance(schoolId, studentId),
    admin
      .from("payments")
      .select("id, amount, method, status, paid_at, receipt_no, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin.from("schools").select("currency").eq("id", schoolId).maybeSingle(),
  ]);

  const payments = ((paymentsRes.data ?? []) as Array<{ id: string; amount: number; method: string; status: string; paid_at: string | null; receipt_no: string | null }>).map(
    (p) => ({
      id: String(p.id),
      amount: Number(p.amount),
      method: String(p.method),
      status: String(p.status),
      paidAt: p.paid_at ? String(p.paid_at) : null,
      receiptNo: p.receipt_no ? String(p.receipt_no) : null,
    }),
  );
  const currency = String((schoolRes.data as { currency?: string | null } | null)?.currency ?? "XOF");
  return { balance, payments, currency };
}
