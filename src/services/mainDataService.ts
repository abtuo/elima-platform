import type { AdminTrendPoint, Assignment, ChildSummary, ClassInfo, GradeSummary, MessagePreview, PaymentSummary, ResourceItem, StudentAdminProfile, StudentDirectoryItem, SubjectOption, TeacherDirectoryItem, TimetableEvent } from "../types/school";
import { demoAccounts, demoAssignments, demoChildren, demoClasses, demoClassStudents, demoGrades, demoMessages, demoPayments, demoResources, demoTimetableEvents } from "../constants/demoData";
import { isDemoModeActive } from "./env";
import { mainDbClient } from "./mainDbClient";
import { communicationKind, type CommunicationKind } from "@/lib/communications";
import { DEMO_REFERENCE_DATE, schoolDateKey } from "@/lib/schoolDateTime";

function useDemo() { return isDemoModeActive() || !mainDbClient; }
function queryFailed(scope: string, error: unknown) { console.error(`[Elima data] ${scope}`, error); }

async function currentUserId() {
  const { data } = await mainDbClient!.auth.getUser();
  return data.user?.id ?? null;
}

async function currentTenant() {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await mainDbClient!.from("users").select("id, school_id, role, school:schools(is_demo)").eq("id", userId).maybeSingle();
  if (error) { queryFailed("profil locataire", error); return null; }
  if (!data) return null;
  const schoolRelation = (data as Record<string, unknown>).school;
  const school = (Array.isArray(schoolRelation) ? schoolRelation[0] : schoolRelation) as { is_demo?: boolean } | null | undefined;
  return { id: String(data.id), school_id: data.school_id ? String(data.school_id) : null, role: String(data.role), is_demo: Boolean(school?.is_demo) };
}

async function parentDomainId(parentUserId: string) {
  const { data, error } = await mainDbClient!.from("parents").select("id").eq("user_id", parentUserId).maybeSingle();
  if (error) { queryFailed("profil parent", error); return null; }
  return data?.id ? String(data.id) : null;
}

async function linkedStudentIds(parentUserId?: string) {
  const userId = parentUserId || await currentUserId();
  if (!userId) return [];
  const parentId = await parentDomainId(userId);
  if (!parentId) return [];
  const { data, error } = await mainDbClient!.from("student_parents").select("student_id").eq("parent_id", parentId);
  if (error) { queryFailed("liens parent-enfant", error); return []; }
  return (data ?? []).map((row) => String(row.student_id));
}

export async function getChildren(parentUserId: string): Promise<ChildSummary[]> {
  if (useDemo()) return demoChildren;
  const parentId = await parentDomainId(parentUserId);
  if (!parentId) return [];
  const { data, error } = await mainDbClient!.from("student_parents").select("student:students(id, full_name, class_id, class:classes(name))").eq("parent_id", parentId);
  if (error) { queryFailed("enfants", error); return []; }

  return Promise.all((data ?? []).map(async (row: Record<string, unknown>) => {
    const student = row.student as { id: string; full_name: string; class_id: string; class?: { name?: string } | null } | null;
    if (!student) return null;
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: absences }, { count: homeworkCount }, { data: lastGrade }] = await Promise.all([
      mainDbClient!.from("attendance").select("id", { count: "exact", head: true }).eq("student_id", student.id).in("status", ["ABSENT", "LATE"]),
      mainDbClient!.from("homeworks").select("id", { count: "exact", head: true }).eq("class_id", student.class_id).gte("due_date", today),
      mainDbClient!.from("grades").select("score, evaluation:evaluations(max_score)").eq("student_id", student.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const evaluation = lastGrade?.evaluation as unknown as { max_score?: number } | null;
    return { id: student.id, name: student.full_name, className: student.class?.name ?? "Classe non renseignée", recentGrade: lastGrade ? `${Number(lastGrade.score)}/${Number(evaluation?.max_score ?? 20)}` : "—", absences: absences ?? 0, pendingAssignments: homeworkCount ?? 0 };
  })).then((rows) => rows.filter((row): row is ChildSummary => Boolean(row)));
}

export async function getAssignments(classId?: string): Promise<Assignment[]> {
  if (useDemo()) {
    const email = typeof window === "undefined" ? null : localStorage.getItem("elima_demo_session");
    const account = demoAccounts.find((item) => item.email === email);
    return account?.role === "TEACHER" ? demoAssignments.filter((assignment) => assignment.subject === "Mathématiques") : demoAssignments;
  }
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  let query = mainDbClient!.from("homeworks").select("id, title, due_date, resource_url, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).order("due_date").limit(40);
  if (classId) query = query.eq("class_id", classId);
  if (tenant.role === "TEACHER") {
    const { data: teacher } = await mainDbClient!.from("teachers").select("id").eq("user_id", tenant.id).maybeSingle();
    if (!teacher?.id) return [];
    query = query.eq("teacher_id", teacher.id);
  }
  const { data, error } = await query;
  if (error) { queryFailed("devoirs", error); return []; }
  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), title: String(row.title), subject: (row.subject as { name?: string } | null)?.name ?? "Matière", className: (row.class as { name?: string } | null)?.name ?? "Classe", dueDate: String(row.due_date), status: String(row.due_date) < today ? "late" : "pending", resourceUrl: row.resource_url ? String(row.resource_url) : undefined }));
}

export async function getRecentGrades(studentId?: string): Promise<GradeSummary[]> {
  if (useDemo()) return demoGrades;
  let resolvedStudentId: string | undefined;
  if (studentId) {
    const { data: student } = await mainDbClient!.from("students").select("id").or(`id.eq.${studentId},user_id.eq.${studentId}`).limit(1).maybeSingle();
    resolvedStudentId = student?.id ? String(student.id) : undefined;
  }
  if (!resolvedStudentId) { const ids = await linkedStudentIds(); resolvedStudentId = ids[0]; }
  if (!resolvedStudentId) { const userId = await currentUserId(); const { data } = await mainDbClient!.from("students").select("id").eq("user_id", userId ?? "").maybeSingle(); resolvedStudentId = data?.id; }
  if (!resolvedStudentId) return [];
  const { data, error } = await mainDbClient!.from("grades").select("id, score, evaluation:evaluations(title, max_score, evaluation_date, subject:subjects(name))").eq("student_id", resolvedStudentId).order("created_at", { ascending: false }).limit(12);
  if (error) { queryFailed("notes", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => { const evaluation = row.evaluation as { title?: string; max_score?: number; evaluation_date?: string; subject?: { name?: string } | null } | null; return { id: String(row.id), subject: evaluation?.subject?.name ?? "Matière", title: evaluation?.title ?? "Évaluation", score: Number(row.score), maxScore: Number(evaluation?.max_score ?? 20), date: evaluation?.evaluation_date ?? "" }; });
}

export type MessageScope = "mine" | "school";

function hiddenDemoConversationIds() {
  if (typeof window === "undefined") return new Set<string>();
  try { return new Set<string>(JSON.parse(localStorage.getItem("elima_hidden_conversations") ?? "[]")); }
  catch { return new Set<string>(); }
}

function readDemoConversationIds() {
  if (typeof window === "undefined") return new Set<string>();
  try { return new Set<string>(JSON.parse(localStorage.getItem("elima_read_conversations") ?? "[]")); }
  catch { return new Set<string>(); }
}

export async function getCommunications(kind: CommunicationKind, scope: MessageScope = "mine"): Promise<MessagePreview[]> {
  if (useDemo()) {
    const hidden = hiddenDemoConversationIds();
    const read = readDemoConversationIds();
    return demoMessages
      .filter((item) => (item.kind ?? communicationKind(item.conversationType)) === kind && !hidden.has(item.conversationId))
      .map((item) => read.has(item.conversationId) ? { ...item, read: true } : item);
  }
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
  let conversations: Array<{ id: string; title: string | null; type: string | null; last_message_at: string | null }> = [];

  if (scope === "school" && adminRoles.includes(tenant.role)) {
    const { error: auditError } = await mainDbClient!.rpc("mobile_log_school_message_access");
    if (auditError) { queryFailed("audit consultation messagerie", auditError); return []; }
    const { data, error } = await mainDbClient!.from("conversations").select("id, title, type, last_message_at").eq("school_id", tenant.school_id);
    if (error) { queryFailed("conversations établissement", error); return []; }
    conversations = data ?? [];
  } else if (adminRoles.includes(tenant.role)) {
    const { data: memberships, error } = await mainDbClient!.from("conversation_participants").select("conversation_id").eq("participant_type", "USER").eq("user_id", tenant.id);
    if (error) { queryFailed("conversations utilisateur", error); return []; }
    const ids = [...new Set((memberships ?? []).map((row) => String(row.conversation_id)))];
    if (ids.length) {
      const { data, error: conversationsError } = await mainDbClient!.from("conversations").select("id, title, type, last_message_at").in("id", ids);
      if (conversationsError) { queryFailed("conversations utilisateur", conversationsError); return []; }
      conversations = data ?? [];
    }
  } else {
    // Les règles RLS calculent les conversations explicites, de classe et de famille.
    const { data, error } = await mainDbClient!.from("conversations").select("id, title, type, last_message_at").eq("school_id", tenant.school_id);
    if (error) { queryFailed("conversations accessibles", error); return []; }
    conversations = data ?? [];
  }

  conversations = conversations.filter((conversation) => communicationKind(conversation.type) === kind);
  const conversationIds = conversations.map((conversation) => String(conversation.id));
  if (!conversationIds.length) return [];
  const { data, error } = await mainDbClient!.from("messages").select("id, conversation_id, content, created_at, sender_id, read_by, sender:users(full_name)").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500);
  if (error) { queryFailed("messages", error); return []; }
  const conversationById = new Map(conversations.map((conversation) => [String(conversation.id), conversation]));
  const previews = new Map<string, MessagePreview>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const readBy = Array.isArray(row.read_by) ? row.read_by.map(String) : [];
    const conversationId = String(row.conversation_id ?? "");
    const conversation = conversationById.get(conversationId);
    const rowIsRead = String(row.sender_id ?? "") === tenant.id || readBy.includes(tenant.id);
    const existing = previews.get(conversationId);
    if (existing) {
      if (!rowIsRead) existing.read = false;
      continue;
    }
    previews.set(conversationId, {
      id: String(row.id), conversationId,
      subject: conversation?.title ?? (kind === "alert" ? "Alerte" : "Conversation"),
      preview: String(row.content).slice(0, 160),
      sender: (row.sender as { full_name?: string } | null)?.full_name ?? "Établissement",
      date: String(row.created_at).slice(0, 10), read: rowIsRead,
      conversationType: conversation?.type ?? undefined,
      kind, canReply: kind === "message",
    });
  }
  return [...previews.values()];
}

export function getMessages(scope: MessageScope = "mine") { return getCommunications("message", scope); }
export function getAlerts(scope: MessageScope = "mine") { return getCommunications("alert", scope); }

export async function getAdminTeachers(): Promise<TeacherDirectoryItem[]> {
  if (useDemo()) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!.from("teachers").select("id, primary_subject, user:users(full_name, email, phone), assignments:teacher_subject_classes(class:classes(name), subject:subjects(name))").eq("school_id", tenant.school_id);
  if (error) { queryFailed("annuaire professeurs", error); return []; }
  const scheduledByTeacher = new Map<string, Array<{ class?: { name?: string } | null; subject?: { name?: string } | null }>>();
  if (tenant.is_demo) {
    const { data: scheduled, error: timetableError } = await mainDbClient!.from("timetable_events").select("teacher_id, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).gte("starts_at", "2026-06-22T00:00:00.000Z").lt("starts_at", "2026-06-27T00:00:00.000Z");
    if (timetableError) queryFailed("affectations planning professeurs", timetableError);
    for (const item of (scheduled ?? []) as Array<Record<string, unknown>>) {
      const teacherId = String(item.teacher_id);
      const assignments = scheduledByTeacher.get(teacherId) ?? [];
      assignments.push({ class: item.class as { name?: string } | null, subject: item.subject as { name?: string } | null });
      scheduledByTeacher.set(teacherId, assignments);
    }
  }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = row.user as { full_name?: string; email?: string; phone?: string } | null;
    const rawAssignments = (row.assignments ?? []) as Array<{ class?: { name?: string } | null; subject?: { name?: string } | null }>;
    const assignments = scheduledByTeacher.get(String(row.id)) ?? (tenant.is_demo && row.primary_subject ? rawAssignments.filter((item) => item.subject?.name === row.primary_subject) : rawAssignments);
    return {
      id: String(row.id), name: user?.full_name ?? "Professeur", email: user?.email, phone: user?.phone,
      classes: [...new Set(assignments.map((item) => item.class?.name).filter((name): name is string => Boolean(name)))],
      subjects: [...new Set(assignments.map((item) => item.subject?.name).filter((name): name is string => Boolean(name)))],
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getSchoolSubjects(): Promise<SubjectOption[]> {
  if (useDemo()) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!.from("subjects").select("id, name").eq("school_id", tenant.school_id).order("name");
  if (error) { queryFailed("matières", error); return []; }
  return (data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) }));
}

export async function getPayments(): Promise<PaymentSummary[]> {
  if (useDemo()) return demoPayments;
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  let query = mainDbClient!.from("payments").select("id, amount, status, paid_at, created_at, installment:fee_installments(label), student:students(full_name)").eq("school_id", tenant.school_id).order("created_at", { ascending: false }).limit(20);
  if (tenant.role === "PARENT") { const ids = await linkedStudentIds(tenant.id); if (!ids.length) return []; query = query.in("student_id", ids); }
  const { data, error } = await query;
  if (error) { queryFailed("paiements", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => { const rawStatus = String(row.status); const status: PaymentSummary["status"] = rawStatus === "paid" ? "paid" : rawStatus === "late" ? "overdue" : "pending"; return { id: String(row.id), label: (row.installment as { label?: string } | null)?.label ?? `Paiement · ${(row.student as { full_name?: string } | null)?.full_name ?? "Élève"}`, amount: Number(row.amount), status, date: String(row.paid_at ?? row.created_at).slice(0, 10) }; });
}

export async function getTeacherClasses(): Promise<ClassInfo[]> {
  if (useDemo()) return demoClasses;
  const tenant = await currentTenant();
  if (!tenant) return [];
  const { data: teacher, error: teacherError } = await mainDbClient!.from("teachers").select("id, primary_subject").eq("user_id", tenant.id).maybeSingle();
  if (teacherError || !teacher) { if (teacherError) queryFailed("profil enseignant", teacherError); return []; }
  let rows: Array<Record<string, unknown>> = [];
  if (tenant.is_demo) {
    const { data, error } = await mainDbClient!.from("timetable_events").select("class:classes(id, name, students(count)), subject:subjects(name), starts_at").eq("teacher_id", teacher.id).eq("school_id", tenant.school_id ?? "").gte("starts_at", "2026-06-22T00:00:00.000Z").lt("starts_at", "2026-06-27T00:00:00.000Z").order("starts_at");
    if (error) queryFailed("classes planifiées enseignant", error);
    rows = (data ?? []) as Array<Record<string, unknown>>;
  }
  if (!rows.length) {
    const { data, error } = await mainDbClient!.from("teacher_subject_classes").select("class:classes(id, name, students(count)), subject:subjects(name)").eq("teacher_id", teacher.id);
    if (error) { queryFailed("classes enseignant", error); return []; }
    rows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => !tenant.is_demo || !teacher.primary_subject || (row.subject as { name?: string } | null)?.name === teacher.primary_subject);
  }
  const classes = new Map<string, ClassInfo & { subjects: Set<string> }>();
  for (const row of rows) {
    const klass = row.class as { id?: string; name?: string; students?: Array<{ count: number }> } | null;
    if (!klass?.id) continue;
    const subject = (row.subject as { name?: string } | null)?.name ?? "Matière";
    const existing = classes.get(klass.id);
    if (existing) { existing.subjects.add(subject); continue; }
    classes.set(klass.id, { id: klass.id, name: klass.name ?? "Classe", subject, subjects: new Set([subject]), studentCount: klass.students?.[0]?.count ?? 0 });
  }
  return [...classes.values()].map(({ subjects, ...klass }) => ({ ...klass, subject: [...subjects].join(" · ") })).sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
}

export async function getResources(classId?: string): Promise<ResourceItem[]> {
  if (useDemo()) return demoResources;
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  let query = mainDbClient!.from("homeworks").select("id, title, description, resource_url, created_at, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).not("resource_url", "is", null).order("created_at", { ascending: false }).limit(30);
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) { queryFailed("ressources", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), title: String(row.title), description: row.description ? String(row.description) : undefined, type: "ressource", subject: (row.subject as { name?: string } | null)?.name ?? "Matière", className: (row.class as { name?: string } | null)?.name ?? "Classe", url: String(row.resource_url), publishedAt: String(row.created_at).slice(0, 10) }));
}

export async function getAdminStats() {
  if (useDemo()) return { students: 293, teachers: 9, absencesToday: 14, pendingPayments: 23 };
  const tenant = await currentTenant();
  if (!tenant?.school_id) return { students: 0, teachers: 0, absencesToday: 0, pendingPayments: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const [students, teachers, attendance, payments] = await Promise.all([
    mainDbClient!.from("students").select("id", { count: "exact", head: true }).eq("school_id", tenant.school_id),
    mainDbClient!.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", tenant.school_id),
    mainDbClient!.from("attendance").select("id", { count: "exact", head: true }).eq("school_id", tenant.school_id).eq("date", today).in("status", ["ABSENT", "LATE"]),
    mainDbClient!.from("payments").select("id", { count: "exact", head: true }).eq("school_id", tenant.school_id).in("status", ["pending", "late"]),
  ]);
  return { students: students.count ?? 0, teachers: teachers.count ?? 0, absencesToday: attendance.count ?? 0, pendingPayments: payments.count ?? 0 };
}

export async function getAdminStudents(): Promise<StudentDirectoryItem[]> {
  if (useDemo()) return demoChildren.map((student) => ({ id: student.id, name: student.name, className: student.className, classId: `demo-${student.className}`, level: student.className.split(" ")[0] }));
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!
    .from("students")
    .select("id, full_name, registration_number, photo_url, class_id, class:classes(id, name, level)")
    .eq("school_id", tenant.school_id)
    .order("full_name", { ascending: true });
  if (error) { queryFailed("annuaire élèves", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const klass = row.class as { id?: string; name?: string; level?: string } | null;
    return {
    id: String(row.id),
    name: String(row.full_name ?? "Élève"),
    className: klass?.name ?? "Classe non renseignée",
    classId: klass?.id ?? (row.class_id ? String(row.class_id) : undefined),
    level: klass?.level ?? "Niveau non renseigné",
    registrationNumber: row.registration_number ? String(row.registration_number) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  }; });
}

function rounded(value: number) { return Math.round(value * 10) / 10; }

export async function getStudentAdminProfile(studentId: string): Promise<StudentAdminProfile | null> {
  if (useDemo()) {
    const student = demoChildren.find((item) => item.id === studentId);
    if (!student) return null;
    const normalizedGrades = demoGrades.map((grade) => ({ ...grade, normalizedScore: rounded((grade.score / grade.maxScore) * 20) }));
    const subjectAverages = [...new Set(normalizedGrades.map((grade) => grade.subject))].map((subject) => {
      const grades = normalizedGrades.filter((grade) => grade.subject === subject);
      return { subject, average: rounded(grades.reduce((sum, grade) => sum + grade.normalizedScore, 0) / grades.length), gradeCount: grades.length };
    });
    const overallAverage = rounded(normalizedGrades.reduce((sum, grade) => sum + grade.normalizedScore, 0) / normalizedGrades.length);
    return {
      id: student.id, name: student.name, className: student.className, classId: `demo-${student.className}`, level: student.className.split(" ")[0],
      attendance: { total: 30, present: 30 - student.absences, absent: student.absences, late: 0, rate: rounded(((30 - student.absences) / 30) * 100) },
      overallAverage, previousAverage: overallAverage - 0.8, evolution: 0.8, trend: "improving", subjectAverages,
      recentGrades: normalizedGrades.map((grade) => ({ id: grade.id, subject: grade.subject, title: grade.title, score: grade.score, maxScore: grade.maxScore, normalizedScore: grade.normalizedScore, date: grade.date })),
    };
  }
  const tenant = await currentTenant();
  if (!tenant?.school_id) return null;
  const { data: student, error: studentError } = await mainDbClient!
    .from("students")
    .select("id, full_name, registration_number, photo_url, birth_date, class_id, class:classes(id, name, level)")
    .eq("id", studentId)
    .eq("school_id", tenant.school_id)
    .maybeSingle();
  if (studentError || !student) { if (studentError) queryFailed("profil élève", studentError); return null; }

  const [{ data: attendance, error: attendanceError }, { data: grades, error: gradesError }] = await Promise.all([
    mainDbClient!.from("attendance").select("status, date").eq("student_id", studentId).order("date", { ascending: false }),
    mainDbClient!.from("grades").select("id, score, created_at, evaluation:evaluations(title, max_score, coefficient, evaluation_date, subject:subjects(name))").eq("student_id", studentId).order("created_at", { ascending: false }).limit(80),
  ]);
  if (attendanceError) queryFailed("assiduité élève", attendanceError);
  if (gradesError) queryFailed("notes élève", gradesError);

  const attendanceRows = attendance ?? [];
  const present = attendanceRows.filter((row) => row.status === "PRESENT").length;
  const absent = attendanceRows.filter((row) => row.status === "ABSENT").length;
  const late = attendanceRows.filter((row) => row.status === "LATE").length;
  const total = attendanceRows.length;
  const normalizedGrades = ((grades ?? []) as Array<Record<string, unknown>>).map((row) => {
    const evaluation = row.evaluation as { title?: string; max_score?: number; coefficient?: number; evaluation_date?: string; subject?: { name?: string } | null } | null;
    const score = Number(row.score);
    const maxScore = Math.max(1, Number(evaluation?.max_score ?? 20));
    return {
      id: String(row.id), subject: evaluation?.subject?.name ?? "Matière", title: evaluation?.title ?? "Évaluation",
      score, maxScore, normalizedScore: rounded((score / maxScore) * 20),
      coefficient: Math.max(0.1, Number(evaluation?.coefficient ?? 1)),
      date: evaluation?.evaluation_date ?? String(row.created_at).slice(0, 10),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const weightedAverage = (rows: typeof normalizedGrades) => rows.length ? rounded(rows.reduce((sum, grade) => sum + grade.normalizedScore * grade.coefficient, 0) / rows.reduce((sum, grade) => sum + grade.coefficient, 0)) : null;
  const subjectAverages = [...new Set(normalizedGrades.map((grade) => grade.subject))].map((subject) => {
    const subjectGrades = normalizedGrades.filter((grade) => grade.subject === subject);
    return { subject, average: weightedAverage(subjectGrades) ?? 0, gradeCount: subjectGrades.length };
  }).sort((a, b) => b.average - a.average);
  const recentWindow = normalizedGrades.slice(0, Math.min(8, normalizedGrades.length));
  const previousWindow = normalizedGrades.slice(recentWindow.length, recentWindow.length * 2);
  const overallAverage = weightedAverage(recentWindow);
  const previousAverage = weightedAverage(previousWindow);
  const evolution = overallAverage !== null && previousAverage !== null ? rounded(overallAverage - previousAverage) : null;
  const trend = evolution === null ? "unknown" : evolution > 0.5 ? "improving" : evolution < -0.5 ? "declining" : "stable";
  const klass = student.class as { id?: string; name?: string; level?: string } | null;
  return {
    id: String(student.id), name: String(student.full_name), className: klass?.name ?? "Classe non renseignée",
    classId: klass?.id ?? String(student.class_id), level: klass?.level ?? "Niveau non renseigné",
    registrationNumber: student.registration_number ?? undefined, photoUrl: student.photo_url ?? undefined,
    birthDate: student.birth_date ?? undefined,
    attendance: { total, present, absent, late, rate: total ? rounded((present / total) * 100) : 0 },
    overallAverage, previousAverage, evolution, trend, subjectAverages,
    recentGrades: normalizedGrades.slice(0, 6).map(({ coefficient: _coefficient, ...grade }) => grade),
  };
}

export async function getClassStudents(classId: string): Promise<StudentDirectoryItem[]> {
  if (useDemo()) return demoClassStudents[classId] ?? [];
  if (!classId) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!
    .from("students")
    .select("id, full_name, registration_number, photo_url, class_id, class:classes(id, name, level)")
    .eq("school_id", tenant.school_id)
    .eq("class_id", classId)
    .order("full_name", { ascending: true });
  if (error) { queryFailed("élèves de la classe", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const klass = row.class as { id?: string; name?: string; level?: string } | null;
    return {
    id: String(row.id),
    name: String(row.full_name ?? "Élève"),
    className: klass?.name ?? "Classe",
    classId: klass?.id ?? (row.class_id ? String(row.class_id) : undefined),
    level: klass?.level ?? "Niveau non renseigné",
    registrationNumber: row.registration_number ? String(row.registration_number) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  }; });
}

export async function getTimetable(days = 2): Promise<TimetableEvent[]> {
  if (useDemo()) {
    const email = typeof window === "undefined" ? null : localStorage.getItem("elima_demo_session");
    const account = demoAccounts.find((item) => item.email === email);
    let savedEvaluations: TimetableEvent[] = [];
    if (typeof window !== "undefined") {
      try { savedEvaluations = JSON.parse(localStorage.getItem("elima_demo_evaluation_events") ?? "[]") as TimetableEvent[]; } catch { savedEvaluations = []; }
    }
    let events = [...demoTimetableEvents, ...savedEvaluations].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (account?.role === "TEACHER") events = events.filter((event) => event.subject === "Mathématiques");
    if (account?.role === "STUDENT") events = events.filter((event) => event.className === ("className" in account ? account.className : "6ème B"));
    if (account?.role === "PARENT" || !account) events = events.filter((event) => event.className === "6ème B");
    const startKey = days > 2 ? "2026-06-22" : DEMO_REFERENCE_DATE;
    const start = new Date(`${startKey}T00:00:00.000Z`);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + days);
    return events.filter((event) => event.startsAt >= start.toISOString() && event.startsAt < end.toISOString());
  }
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const startKey = tenant.is_demo ? (days > 2 ? "2026-06-22" : DEMO_REFERENCE_DATE) : schoolDateKey(new Date());
  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + days);
  let classIds: string[] = [];
  let teacherId: string | null = null;
  if (tenant.role === "STUDENT") {
    const { data } = await mainDbClient!.from("students").select("class_id").eq("user_id", tenant.id).maybeSingle();
    if (data?.class_id) classIds = [String(data.class_id)];
  } else if (tenant.role === "PARENT") {
    const ids = await linkedStudentIds(tenant.id);
    if (ids.length) { const { data } = await mainDbClient!.from("students").select("class_id").in("id", ids); classIds = [...new Set((data ?? []).map((row) => String(row.class_id)).filter(Boolean))]; }
  } else if (tenant.role === "TEACHER") {
    const { data } = await mainDbClient!.from("teachers").select("id").eq("user_id", tenant.id).maybeSingle(); teacherId = data?.id ? String(data.id) : null;
  }
  let query = mainDbClient!.from("timetable_events").select("id, starts_at, ends_at, room, event_type, title, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at").limit(100);
  if (classIds.length) query = query.in("class_id", classIds);
  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (["STUDENT", "PARENT"].includes(tenant.role) && !classIds.length) return [];
  let { data, error } = await query;
  if (error) {
    // Compatibilité avec une base qui n'a pas encore reçu les colonnes
    // event_type/title : les cours existants doivent rester visibles.
    let legacyQuery = mainDbClient!.from("timetable_events").select("id, starts_at, ends_at, room, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at").limit(100);
    if (classIds.length) legacyQuery = legacyQuery.in("class_id", classIds);
    if (teacherId) legacyQuery = legacyQuery.eq("teacher_id", teacherId);
    const legacy = await legacyQuery;
    if (legacy.error) { queryFailed("emploi du temps", error); queryFailed("emploi du temps compatible", legacy.error); return []; }
    data = legacy.data as typeof data;
    error = null;
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), subject: (row.subject as { name?: string } | null)?.name ?? "Cours", className: (row.class as { name?: string } | null)?.name ?? "Classe", startsAt: String(row.starts_at), endsAt: String(row.ends_at), room: row.room ? String(row.room) : undefined, referenceDate: tenant.is_demo ? DEMO_REFERENCE_DATE : undefined, eventType: row.event_type === "evaluation" ? "evaluation" : "course", title: row.title ? String(row.title) : undefined }));
}

export async function createTeacherEvaluationEvent(input: { classId: string; title: string; date: string; startsAt: string; endsAt: string; maxScore?: number }): Promise<TimetableEvent> {
  if (useDemo()) {
    const klass = demoClasses.find((item) => item.id === input.classId);
    if (!klass) throw new Error("Classe introuvable.");
    const startsAt = `${input.date}T${input.startsAt}:00.000Z`;
    const endsAt = `${input.date}T${input.endsAt}:00.000Z`;
    let current: TimetableEvent[] = [];
    try { current = JSON.parse(localStorage.getItem("elima_demo_evaluation_events") ?? "[]") as TimetableEvent[]; } catch { current = []; }
    const conflict = [...demoTimetableEvents, ...current].some((item) => item.startsAt < endsAt && item.endsAt > startsAt && (item.className === klass.name || item.subject === klass.subject));
    if (conflict) throw new Error("Ce créneau chevauche déjà un cours ou une évaluation.");
    const event: TimetableEvent = {
      id: `demo-evaluation-${crypto.randomUUID()}`,
      subject: klass.subject,
      className: klass.name,
      startsAt,
      endsAt,
      referenceDate: DEMO_REFERENCE_DATE,
      eventType: "evaluation",
      title: input.title.trim(),
    };
    localStorage.setItem("elima_demo_evaluation_events", JSON.stringify([...current, event]));
    return event;
  }
  const { data, error } = await mainDbClient!.rpc("mobile_create_teacher_evaluation_event", {
    p_class_id: input.classId,
    p_title: input.title.trim(),
    p_starts_at: `${input.date}T${input.startsAt}:00.000Z`,
    p_ends_at: `${input.date}T${input.endsAt}:00.000Z`,
    p_max_score: input.maxScore ?? 20,
  });
  if (error) throw new Error(error.message);
  return { id: String(data), subject: "Évaluation", className: "Classe", startsAt: `${input.date}T${input.startsAt}:00.000Z`, endsAt: `${input.date}T${input.endsAt}:00.000Z`, eventType: "evaluation", title: input.title.trim() };
}

export async function getAdminTrends(): Promise<AdminTrendPoint[]> {
  if (useDemo()) return [];
  const tenant = await currentTenant(); if (!tenant?.school_id) return [];
  const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
  const [attendance, payments] = await Promise.all([
    mainDbClient!.from("attendance").select("date, status").eq("school_id", tenant.school_id).gte("date", start.toISOString().slice(0, 10)),
    mainDbClient!.from("payments").select("amount, paid_at, created_at, status").eq("school_id", tenant.school_id).gte("created_at", start.toISOString()),
  ]);
  if (attendance.error) queryFailed("tendance assiduité", attendance.error);
  if (payments.error) queryFailed("tendance paiements", payments.error);
  return Array.from({ length: 7 }, (_, offset) => { const date = new Date(start); date.setDate(start.getDate() + offset); const key = date.toISOString().slice(0, 10); return { label: date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""), attendance: (attendance.data ?? []).filter((row) => row.date === key && row.status !== "PRESENT").length, payments: (payments.data ?? []).filter((row) => String(row.paid_at ?? row.created_at).slice(0, 10) === key && row.status === "paid").reduce((sum, row) => sum + Number(row.amount), 0) }; });
}
