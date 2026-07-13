import type { AdminTrendPoint, Assignment, ChildSummary, ClassInfo, GradeSummary, MessagePreview, PaymentSummary, ResourceItem, StudentDirectoryItem, SubjectOption, TeacherDirectoryItem, TimetableEvent } from "../types/school";
import { demoAssignments, demoChildren, demoClasses, demoGrades, demoMessages, demoPayments, demoResources } from "../constants/demoData";
import { isDemoModeActive } from "./env";
import { mainDbClient } from "./mainDbClient";

function useDemo() { return isDemoModeActive() || !mainDbClient; }
function queryFailed(scope: string, error: unknown) { console.error(`[Elima data] ${scope}`, error); }

async function currentUserId() {
  const { data } = await mainDbClient!.auth.getUser();
  return data.user?.id ?? null;
}

async function currentTenant() {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await mainDbClient!.from("users").select("id, school_id, role").eq("id", userId).maybeSingle();
  if (error) { queryFailed("profil locataire", error); return null; }
  return data as { id: string; school_id: string | null; role: string } | null;
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
  if (useDemo()) return demoAssignments;
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  let query = mainDbClient!.from("homeworks").select("id, title, due_date, resource_url, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).order("due_date").limit(40);
  if (classId) query = query.eq("class_id", classId);
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

export async function getMessages(): Promise<MessagePreview[]> {
  if (useDemo()) return demoMessages;
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const staffRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COMPTABLE", "TEACHER"];
  let conversationIds: string[] = [];
  if (staffRoles.includes(tenant.role)) {
    const { data, error } = await mainDbClient!.from("conversations").select("id").eq("school_id", tenant.school_id);
    if (error) { queryFailed("conversations établissement", error); return []; }
    conversationIds = (data ?? []).map((row) => String(row.id));
  } else {
    const { data: memberships, error } = await mainDbClient!.from("conversation_participants").select("conversation_id").eq("participant_type", "USER").eq("user_id", tenant.id);
    if (error) { queryFailed("conversations utilisateur", error); return []; }
    conversationIds = (memberships ?? []).map((row) => String(row.conversation_id));
    if (tenant.role === "STUDENT") {
      const { data: student } = await mainDbClient!.from("students").select("class_id").eq("user_id", tenant.id).maybeSingle();
      if (student?.class_id) {
        const { data: classMemberships } = await mainDbClient!.from("conversation_participants").select("conversation_id").eq("participant_type", "CLASS").eq("class_id", student.class_id);
        conversationIds.push(...(classMemberships ?? []).map((row) => String(row.conversation_id)));
      }
    }
  }
  conversationIds = [...new Set(conversationIds)];
  if (!conversationIds.length) return [];
  const { data, error } = await mainDbClient!.from("messages").select("id, content, created_at, sender_id, read_by, sender:users(full_name), conversation:conversations(title)").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(30);
  if (error) { queryFailed("messages", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => { const readBy = Array.isArray(row.read_by) ? row.read_by.map(String) : []; return { id: String(row.id), subject: (row.conversation as { title?: string } | null)?.title ?? "Message", preview: String(row.content).slice(0, 160), sender: (row.sender as { full_name?: string } | null)?.full_name ?? "Établissement", date: String(row.created_at).slice(0, 10), read: String(row.sender_id ?? "") === tenant.id || readBy.includes(tenant.id) }; });
}

export async function getAdminTeachers(): Promise<TeacherDirectoryItem[]> {
  if (useDemo()) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!.from("teachers").select("id, user:users(full_name, email, phone), assignments:teacher_subject_classes(class:classes(name))").eq("school_id", tenant.school_id);
  if (error) { queryFailed("annuaire professeurs", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = row.user as { full_name?: string; email?: string; phone?: string } | null;
    const assignments = (row.assignments ?? []) as Array<{ class?: { name?: string } | null }>;
    return { id: String(row.id), name: user?.full_name ?? "Professeur", email: user?.email, phone: user?.phone, classes: [...new Set(assignments.map((item) => item.class?.name).filter((name): name is string => Boolean(name)))] };
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
  const userId = await currentUserId();
  if (!userId) return [];
  const { data: teacher, error: teacherError } = await mainDbClient!.from("teachers").select("id").eq("user_id", userId).maybeSingle();
  if (teacherError || !teacher) { if (teacherError) queryFailed("profil enseignant", teacherError); return []; }
  const { data, error } = await mainDbClient!.from("teacher_subject_classes").select("class:classes(id, name, students(count)), subject:subjects(name)").eq("teacher_id", teacher.id);
  if (error) { queryFailed("classes enseignant", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => { const klass = row.class as { id: string; name: string; students?: Array<{ count: number }> } | null; return { id: klass?.id ?? "", name: klass?.name ?? "Classe", subject: (row.subject as { name?: string } | null)?.name ?? "Matière", studentCount: klass?.students?.[0]?.count ?? 0 }; });
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
  if (useDemo()) return { students: 428, teachers: 32, absencesToday: 14, pendingPayments: 23 };
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
  if (useDemo()) return demoChildren.map((student) => ({ id: student.id, name: student.name, className: student.className }));
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!
    .from("students")
    .select("id, full_name, registration_number, photo_url, class:classes(name)")
    .eq("school_id", tenant.school_id)
    .order("full_name", { ascending: true });
  if (error) { queryFailed("annuaire élèves", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.full_name ?? "Élève"),
    className: (row.class as { name?: string } | null)?.name ?? "Classe non renseignée",
    registrationNumber: row.registration_number ? String(row.registration_number) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  }));
}

export async function getClassStudents(classId: string): Promise<StudentDirectoryItem[]> {
  if (useDemo()) return demoChildren.map((student) => ({ id: student.id, name: student.name, className: student.className }));
  if (!classId) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const { data, error } = await mainDbClient!
    .from("students")
    .select("id, full_name, registration_number, photo_url, class:classes(name)")
    .eq("school_id", tenant.school_id)
    .eq("class_id", classId)
    .order("full_name", { ascending: true });
  if (error) { queryFailed("élèves de la classe", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.full_name ?? "Élève"),
    className: (row.class as { name?: string } | null)?.name ?? "Classe",
    registrationNumber: row.registration_number ? String(row.registration_number) : undefined,
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  }));
}

export async function getTimetable(days = 2): Promise<TimetableEvent[]> {
  if (useDemo()) return [];
  const tenant = await currentTenant();
  if (!tenant?.school_id) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + days); end.setHours(23, 59, 59, 999);
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
  let query = mainDbClient!.from("timetable_events").select("id, starts_at, ends_at, room, class:classes(name), subject:subjects(name)").eq("school_id", tenant.school_id).gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).order("starts_at").limit(30);
  if (classIds.length) query = query.in("class_id", classIds);
  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (["STUDENT", "PARENT"].includes(tenant.role) && !classIds.length) return [];
  const { data, error } = await query;
  if (error) { queryFailed("emploi du temps", error); return []; }
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), subject: (row.subject as { name?: string } | null)?.name ?? "Cours", className: (row.class as { name?: string } | null)?.name ?? "Classe", startsAt: String(row.starts_at), endsAt: String(row.ends_at), room: row.room ? String(row.room) : undefined }));
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
