import path from "node:path";
import { randomUUID } from "node:crypto";
import { config as dotenvConfig } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertDemoMode } from "../src/lib/app-mode";
import { DEMO_ACADEMIC_YEAR, DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_SCHOOLS, SECONDARY_CLASSES } from "./demo-config";

dotenvConfig({ path: path.join(process.cwd(), ".env") });
dotenvConfig({ path: path.join(process.cwd(), ".env.local"), override: true });

const REFERENCE_DATE = "2026-06-25";
const SUBJECTS = [
  "Mathématiques",
  "Français",
  "Anglais",
  "Physique-Chimie",
  "SVT",
  "Histoire-Géographie",
  "Philosophie",
  "Espagnol",
  "Informatique",
  "Technologie",
  "EPS",
];
const FIRST_NAMES = ["Koffi", "Aminata", "Yao", "Fatou", "Mamadou", "Adjoua", "Kouassi", "Binta", "Ibrahim", "Akissi", "Sékou", "Mariam"];
const LAST_NAMES = ["Koné", "Traoré", "Yao", "Diallo", "Ouattara", "Kouamé", "Touré", "Camara", "Sangaré", "Bamba", "N'Guessan", "Tuo"];
const CURRENT_EVALUATION_DATES = ["2025-09-18", "2025-10-16", "2025-11-20", "2025-12-11", "2026-01-22", "2026-02-19", "2026-03-19", "2026-04-23", "2026-05-21", "2026-06-20"];
const PREVIOUS_EVALUATION_DATES = ["2024-09-19", "2024-10-17", "2024-11-21", "2024-12-12", "2025-01-23", "2025-02-20", "2025-03-20", "2025-04-24", "2025-05-22", "2025-06-19"];
const RECENT_ATTENDANCE_DATES = ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25"];

type Account = (typeof DEMO_ACCOUNTS)[number];
type ClassRow = { id: string; name: string; level: string };
type StudentRow = { id: string; full_name: string; class_id: string; user_id: string | null };
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type TrendLabel = "IMPROVING" | "STABLE" | "DECLINING";
type ClassAcademicProfile = "excellent" | "solid" | "average" | "fragile" | "declining" | "recovering" | "volatile" | "fatigue";

const RISK_STUDENTS = [
  { fullName: "Habib Koné", className: "4ème A", parentName: "Aminata Koné", average: 7.2, attendance: 88, trend: "DECLINING", risk: "HIGH", alert: true },
  { fullName: "Binta N'Guessan", className: "3ème A", parentName: "Kadiatou N'Guessan", average: 9.1, attendance: 72, trend: "DECLINING", risk: "HIGH", alert: true },
  { fullName: "Ibrahim Bamba", className: "5ème B", parentName: "Moussa Bamba", average: 7.4, attendance: 79, trend: "DECLINING", risk: "HIGH", alert: true },
  { fullName: "Oumar Sangaré", className: "2nde C1", parentName: "Mariam Sangaré", average: 7.8, attendance: 83, trend: "DECLINING", risk: "HIGH", alert: true },
  { fullName: "Akissi Fofana", className: "1ère D", parentName: "Adjoua Fofana", average: 9.8, attendance: 81, trend: "DECLINING", risk: "MEDIUM", alert: true },
  { fullName: "Mamadou Amani", className: "Terminale D", parentName: "Awa Amani", average: 10.1, attendance: 86, trend: "DECLINING", risk: "MEDIUM", alert: true },
  { fullName: "Salimata Touré", className: "6ème B", parentName: "Fatou Touré", average: 10.4, attendance: 84, trend: "STABLE", risk: "MEDIUM", alert: true },
  { fullName: "Adjoua Kouamé", className: "5ème A", parentName: "Jean Kouamé", average: 9.5, attendance: 88, trend: "DECLINING", risk: "MEDIUM", alert: false },
] as const satisfies Array<{
  fullName: string;
  className: string;
  parentName: string;
  average: number;
  attendance: number;
  trend: TrendLabel;
  risk: RiskLevel;
  alert: boolean;
}>;

const DEMO_SUPPLY_PRODUCTS = [
  { name: "Cahier 100 pages", category: "Cahiers", price: 750 },
  { name: "Stylo bleu", category: "Ecriture", price: 150 },
  { name: "Stylo rouge", category: "Ecriture", price: 150 },
  { name: "Crayon HB", category: "Ecriture", price: 100 },
  { name: "Regle 30 cm", category: "Geometrie", price: 300 },
  { name: "Kit geometrie", category: "Geometrie", price: 2500 },
] as const;

/** Liste brouillon pré-remplie pour M. Serge — 6ème B (démo fournitures). */
const SERGE_SUPPLY_LIST_ITEMS = [
  { name: "Cahier 100 pages", quantity: 4, notes: "Pour exercices et travaux dirigés." },
  { name: "Stylo bleu", quantity: 5, notes: "Prévoir une réserve." },
  { name: "Stylo rouge", quantity: 2, notes: "Correction et annotations." },
  { name: "Crayon HB", quantity: 2, notes: null },
  { name: "Regle 30 cm", quantity: 1, notes: "Modèle rigide conseillé." },
  { name: "Kit geometrie", quantity: 1, notes: "Nécessaire pour mathématiques." },
] as const;

const RISK_BY_NAME = new Map<string, (typeof RISK_STUDENTS)[number]>(RISK_STUDENTS.map((student) => [student.fullName, student]));

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function at(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  return code === "42P01" || code === "PGRST205" || /Could not find the table|does not exist|schema cache/i.test(msg);
}

function targetCount(level: string, index: number, principal: boolean) {
  const base = level.includes("Terminale") ? 14 : level.includes("1ère") ? 16 : level.includes("2nde") ? 18 : level.includes("3ème") ? 20 : 22;
  return base + ((index + (principal ? 2 : 0)) % 4);
}

function stableNoise(...values: Array<string | number>) {
  const raw = values.join(":");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 1000003;
  }
  return (hash % 2001) / 1000 - 1;
}

async function createAuthUser(admin: SupabaseClient, account: Account) {
  const existing = await admin.from("users").select("id").eq("email", account.email).maybeSingle();
  if (existing.data?.id) {
    const userId = String(existing.data.id);
    const metadata = { role: account.role, school_id: account.schoolId, full_name: account.fullName };
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { user_metadata: metadata });
    if (authUpdateError) throw authUpdateError;
    const { error: profileUpdateError } = await admin.from("users").update({ school_id: account.schoolId, role: account.role, full_name: account.fullName } as never).eq("id", userId);
    if (profileUpdateError) throw profileUpdateError;
    return userId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: account.role,
      school_id: account.schoolId,
      full_name: account.fullName,
    },
  });
  if (error || !data.user?.id) throw new Error(`auth ${account.email}: ${error?.message ?? "missing user"}`);

  const { error: upsertErr } = await admin.from("users").upsert({
    id: data.user.id,
    email: account.email,
    school_id: account.schoolId,
    role: account.role,
    full_name: account.fullName,
  } as never);
  if (upsertErr) throw upsertErr;
  return data.user.id;
}

async function ensureTeacher(admin: SupabaseClient, schoolId: string, userId: string, subject: string) {
  const { data: existing } = await admin.from("teachers").select("id").eq("user_id", userId).maybeSingle();
  if (existing?.id) {
    await admin.from("teachers").update({ primary_subject: subject } as never).eq("id", existing.id);
    return String(existing.id);
  }
  const { data, error } = await admin
    .from("teachers")
    .insert({ school_id: schoolId, user_id: userId, primary_subject: subject } as never)
    .select("id")
    .single();
  if (error || !data) throw new Error(`teacher: ${error?.message}`);
  return String((data as { id: string }).id);
}

async function seedSchoolStructure(admin: SupabaseClient, school: (typeof DEMO_SCHOOLS)[number]) {
  await admin.from("schools").upsert({
    id: school.id,
    name: school.name,
    country: "Côte d'Ivoire",
    city: school.city,
    status: "private",
    currency: "FCFA",
    is_demo: true,
    demo_slug: school.slug,
  } as never);

  const termRows = [
    ["Trimestre 1", "2025-09-01", "2025-12-19"],
    ["Trimestre 2", "2026-01-06", "2026-03-27"],
    ["Trimestre 3", "2026-04-07", "2026-06-30"],
  ].map(([name, start_date, end_date]) => ({ school_id: school.id, name, start_date, end_date, is_closed: false }));
  const { data: terms, error: termErr } = await admin.from("terms").insert(termRows as never).select("id,name");
  if (termErr) throw termErr;
  const termIds = new Map((terms as Array<{ id: string; name: string }>).map((term) => [term.name, term.id]));
  const currentTermId = termIds.get("Trimestre 3");
  if (currentTermId) await admin.from("schools").update({ current_term_id: currentTermId }).eq("id", school.id);

  const { data: subjectRows, error: subjectErr } = await admin
    .from("subjects")
    .insert(SUBJECTS.map((name) => ({
      school_id: school.id,
      name,
      coefficient:
        name === "Mathématiques" || name === "Français"
          ? 4
          : name === "EPS" || name === "Technologie"
            ? 1
            : 2,
    })) as never)
    .select("id,name");
  if (subjectErr) throw subjectErr;
  const subjects = new Map((subjectRows as Array<{ id: string; name: string }>).map((s) => [s.name, s.id]));

  const { data: classRows, error: classErr } = await admin
    .from("classes")
    .insert(
      SECONDARY_CLASSES.map((cls, index) => ({
        school_id: school.id,
        name: cls.name,
        level: cls.level,
        academic_year: DEMO_ACADEMIC_YEAR,
        capacity: targetCount(cls.level, index, school.principal) + 4,
      })) as never,
    )
    .select("id,name,level");
  if (classErr) throw classErr;
  return { classes: classRows as ClassRow[], subjects, currentTermId, termIds };
}

async function seedUsers(admin: SupabaseClient) {
  const userIds = new Map<string, string>();
  const teacherIds = new Map<string, string>();
  for (const account of DEMO_ACCOUNTS) {
    const userId = await createAuthUser(admin, account);
    userIds.set(account.email, userId);
    if (account.role === "TEACHER") {
      teacherIds.set(account.email, await ensureTeacher(admin, account.schoolId, userId, "subject" in account ? account.subject : "Mathématiques"));
    }
  }
  return { userIds, teacherIds };
}

async function seedTeachingAssignments(admin: SupabaseClient, schoolId: string, classes: ClassRow[], subjects: Map<string, string>, teacherIds: string[]) {
  const classTeacherRows: Record<string, unknown>[] = [];
  const subjectClassRows: Record<string, unknown>[] = [];
  classes.forEach((cls, index) => {
    for (const subjectId of subjects.values()) {
      const teacherId = teacherIds[index % teacherIds.length];
      classTeacherRows.push({ class_id: cls.id, teacher_id: teacherId, subject_id: subjectId });
      subjectClassRows.push({ teacher_id: teacherId, class_id: cls.id, subject_id: subjectId });
    }
  });
  await admin.from("class_teachers").insert(classTeacherRows as never);
  await admin.from("teacher_subject_classes").insert(subjectClassRows as never);
}

async function ensureTeachingAssignment(admin: SupabaseClient, classId: string, teacherId: string, subjectId: string) {
  await admin.from("class_teachers").upsert({ class_id: classId, teacher_id: teacherId, subject_id: subjectId } as never, {
    onConflict: "class_id,teacher_id,subject_id",
  });
  await admin.from("teacher_subject_classes").upsert({ teacher_id: teacherId, class_id: classId, subject_id: subjectId } as never, {
    onConflict: "teacher_id,class_id,subject_id",
  });
}

async function seedTimetableEvents(
  admin: SupabaseClient,
  school: (typeof DEMO_SCHOOLS)[number],
  classes: ClassRow[],
  subjects: Map<string, string>,
  teacherIds: Map<string, string>,
) {
  const byClass = new Map(classes.map((cls) => [cls.name, cls.id]));
  const rows: Record<string, unknown>[] = [];

  async function add(params: {
    teacherEmail: string;
    className: string;
    subjectName: string;
    date: string;
    start: string;
    end: string;
    room: string;
  }) {
    const teacherId = teacherIds.get(params.teacherEmail);
    const classId = byClass.get(params.className);
    const subjectId = subjects.get(params.subjectName);
    if (!teacherId || !classId || !subjectId) return;
    await ensureTeachingAssignment(admin, classId, teacherId, subjectId);
    rows.push({
      school_id: school.id,
      class_id: classId,
      teacher_id: teacherId,
      subject_id: subjectId,
      starts_at: at(params.date, params.start),
      ends_at: at(params.date, params.end),
      room: params.room,
    });
  }

  if (school.principal) {
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "6ème B", subjectName: "Mathématiques", date: "2026-06-22", start: "08:00", end: "09:30", room: "Salle A12" });
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "5ème A", subjectName: "Mathématiques", date: "2026-06-22", start: "14:00", end: "15:30", room: "Salle A12" });
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "6ème B", subjectName: "Mathématiques", date: "2026-06-23", start: "10:00", end: "11:30", room: "Salle A12" });
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "6ème B", subjectName: "Mathématiques", date: "2026-06-25", start: "08:00", end: "09:30", room: "Salle A12" });
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "3ème A", subjectName: "Mathématiques", date: "2026-06-25", start: "11:00", end: "12:30", room: "Salle C01" });
    await add({ teacherEmail: "enseignant.serge@elima.school", className: "6ème A", subjectName: "Mathématiques", date: "2026-06-26", start: "08:00", end: "09:30", room: "Salle A12" });

    await add({ teacherEmail: "teacher.abidjan@seed-elima.invalid", className: "6ème A", subjectName: "Français", date: "2026-06-22", start: "10:00", end: "11:30", room: "Salle B06" });
    await add({ teacherEmail: "teacher.abidjan@seed-elima.invalid", className: "5ème B", subjectName: "Français", date: "2026-06-24", start: "08:00", end: "09:30", room: "Salle B06" });
    await add({ teacherEmail: "teacher.abidjan@seed-elima.invalid", className: "6ème B", subjectName: "Français", date: "2026-06-25", start: "10:00", end: "11:30", room: "Salle B06" });

    await add({ teacherEmail: "enseignant.nadia@elima.school", className: "3ème A", subjectName: "Français", date: "2026-06-23", start: "14:00", end: "15:30", room: "Salle C01" });
    await add({ teacherEmail: "enseignant.nadia@elima.school", className: "3ème A", subjectName: "SVT", date: "2026-06-25", start: "14:00", end: "15:30", room: "Salle D04" });
    await add({ teacherEmail: "enseignant.nadia@elima.school", className: "4ème A", subjectName: "Français", date: "2026-06-26", start: "10:00", end: "11:30", room: "Salle C01" });

    await add({ teacherEmail: "enseignant.karim@elima.school", className: "2nde C1", subjectName: "Physique-Chimie", date: "2026-06-25", start: "09:45", end: "11:15", room: "Laboratoire 1" });
    await add({ teacherEmail: "enseignant.claire@elima.school", className: "1ère A", subjectName: "Anglais", date: "2026-06-25", start: "15:45", end: "17:00", room: "Salle B04" });
  } else {
    const teacher = Array.from(teacherIds.entries()).find(([email]) => email.includes("yamoussoukro"))?.[1];
    const classId = classes[0]?.id;
    const subjectId = subjects.get("Mathématiques");
    if (teacher && classId && subjectId) {
      await ensureTeachingAssignment(admin, classId, teacher, subjectId);
      rows.push({
        school_id: school.id,
        class_id: classId,
        teacher_id: teacher,
        subject_id: subjectId,
        starts_at: at("2026-06-25", "08:00"),
        ends_at: at("2026-06-25", "09:30"),
        room: "Salle A12",
      });
    }
  }

  if (rows.length > 0) {
    await admin.from("timetable_events").insert(rows as never);
  }
}

async function seedStudents(admin: SupabaseClient, school: (typeof DEMO_SCHOOLS)[number], classes: ClassRow[], userIds: Map<string, string>) {
  const students = new Map<string, StudentRow>();
  const portalStudents = school.principal
    ? [
        { fullName: "Awa Koné", className: "6ème B", email: "eleve.awa@elima.school", parentEmail: "parent.mariam@elima.school", parentName: "Mariam Koné" },
        { fullName: "Yao Kouamé", className: "6ème B", email: "eleve.yao@elima.school", parentEmail: "parent.jean@elima.school", parentName: "Jean Kouamé" },
        { fullName: "Lina Traoré", className: "3ème A", email: "eleve.lina@elima.school", parentEmail: "parent.aminata@elima.school", parentName: "Aminata Traoré" },
        { fullName: "Eli Tuo", className: "6ème B", email: "eleve.eli@elima.school", parentEmail: "parent.aboubacar@elima.school", parentName: "Aboubacar Tuo" },
      ]
    : [];
  const named = [
    ...portalStudents,
    ...RISK_STUDENTS.map((student) => ({
      fullName: student.fullName,
      className: student.className,
      parentName: student.parentName,
    })),
  ];

  for (const item of named) {
    const cls = classes.find((c) => c.name === item.className) ?? classes[0];
    const email = "email" in item ? item.email : null;
    const parentEmail = "parentEmail" in item ? item.parentEmail : null;
    const { data, error } = await admin
      .from("students")
      .insert({
        school_id: school.id,
        user_id: email ? (userIds.get(email) ?? null) : null,
        class_id: cls.id,
        full_name: item.fullName,
        photo_url: "/student_profil_1.png",
        registration_number: `${school.city.slice(0, 3).toUpperCase()}-${randomUUID().slice(0, 5)}`,
        parent_name: item.parentName,
        parent_email: parentEmail,
      } as never)
      .select("id,full_name,class_id,user_id")
      .single();
    if (error || !data) throw error;
    students.set(item.fullName, data as StudentRow);

    if (parentEmail) {
      const parentUserId = userIds.get(parentEmail) ?? null;
      const { data: parent, error: parentErr } = await admin
        .from("parents")
        .insert({ school_id: school.id, user_id: parentUserId, email: parentEmail, full_name: item.parentName, phone: "+2250700000000" } as never)
        .select("id")
        .single();
      if (parentErr || !parent) throw parentErr;
      await admin.from("student_parents").insert({ student_id: (data as StudentRow).id, parent_id: (parent as { id: string }).id, relationship: "parent" } as never);
    }
  }

  for (const [index, cls] of classes.entries()) {
    const already = Array.from(students.values()).filter((s) => s.class_id === cls.id).length;
    for (let i = already; i < targetCount(cls.level, index, school.principal); i += 1) {
      const fullName = `${FIRST_NAMES[(i + index) % FIRST_NAMES.length]} ${LAST_NAMES[(i * 2 + index) % LAST_NAMES.length]}`;
      const { data, error } = await admin
        .from("students")
        .insert({
          school_id: school.id,
          class_id: cls.id,
          full_name: fullName,
          photo_url: `/student_profil_${(i % 5) + 1}.png`,
          registration_number: `${school.city.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(2, "0")}${String(i + 1).padStart(2, "0")}`,
        } as never)
        .select("id,full_name,class_id,user_id")
        .single();
      if (error || !data) throw error;
      students.set(fullName, data as StudentRow);
    }
  }
  return students;
}

const CLASS_PROFILE_ORDER: ClassAcademicProfile[] = [
  "solid",
  "excellent",
  "volatile",
  "average",
  "recovering",
  "fragile",
  "solid",
  "declining",
  "fatigue",
  "excellent",
  "average",
  "recovering",
  "volatile",
  "fragile",
];

const PROFILE_BASE: Record<ClassAcademicProfile, number> = {
  excellent: 13.7,
  solid: 12.6,
  average: 11.5,
  fragile: 10.1,
  declining: 11.7,
  recovering: 10.9,
  volatile: 11.9,
  fatigue: 12.1,
};

const PROFILE_MONTH_EFFECTS: Record<ClassAcademicProfile, number[]> = {
  excellent: [0.2, 0.4, 0.1, 0.5, 0.3, 0.6, 0.2, 0.4, 0.1, 0.3],
  solid: [0.1, 0.2, 0.1, 0.3, 0.1, 0.2, 0.0, 0.3, 0.2, 0.1],
  average: [0.2, -0.1, 0.1, 0.0, 0.2, -0.2, 0.1, 0.2, -0.1, 0.1],
  fragile: [-0.2, -0.4, -0.1, -0.3, 0.0, -0.2, 0.1, -0.1, 0.2, 0.0],
  declining: [0.7, 0.5, 0.4, 0.1, -0.1, -0.4, -0.6, -0.8, -1.0, -0.9],
  recovering: [-0.9, -0.8, -0.6, -0.4, -0.5, -0.2, 0.2, 0.5, 0.8, 0.7],
  volatile: [0.6, -0.7, 0.5, -0.2, 0.8, -0.5, 0.4, -0.3, 0.7, -0.1],
  fatigue: [0.5, 0.3, 0.4, 0.1, 0.0, -0.1, -0.2, -0.5, -0.8, -0.6],
};

const SUBJECT_DIFFICULTY: Record<string, number> = {
  "Mathématiques": -0.35,
  "Physique-Chimie": -0.3,
  SVT: -0.05,
  Français: 0.05,
  Anglais: 0.15,
  "Histoire-Géographie": 0.1,
  Philosophie: -0.2,
  Espagnol: 0.1,
  Informatique: 0.35,
  Technologie: 0.2,
  EPS: 0.45,
};

function classProfile(classIndex: number): ClassAcademicProfile {
  return CLASS_PROFILE_ORDER[classIndex % CLASS_PROFILE_ORDER.length];
}

function studentAbility(studentIndex: number, fullName: string) {
  if (RISK_BY_NAME.has(fullName)) return -3.1;
  if (studentIndex === 0 || studentIndex === 1) return 2.75;
  if (studentIndex === 2) return 2.1;
  if (studentIndex === 3 || studentIndex === 4) return 1.35;
  if (studentIndex % 11 === 0) return -2.2;
  if (studentIndex % 7 === 0) return -1.15;
  if (studentIndex % 5 === 0) return 0.65;
  return ((studentIndex % 6) - 2.5) * 0.18;
}


function subjectAppliesToLevel(subject: string, level: string): boolean {
  if (subject === "Philosophie") return /Terminale|1ère/i.test(level);
  return true;
}

const TERM_EVALUATION_DATES: Record<string, string[]> = {
  "Trimestre 1": CURRENT_EVALUATION_DATES.slice(0, 4),
  "Trimestre 2": CURRENT_EVALUATION_DATES.slice(4, 7),
  "Trimestre 3": CURRENT_EVALUATION_DATES.slice(7, 10),
};

const PREVIOUS_TERM_EVALUATION_DATES: Record<string, string[]> = {
  "Trimestre 1": PREVIOUS_EVALUATION_DATES.slice(0, 4),
  "Trimestre 2": PREVIOUS_EVALUATION_DATES.slice(4, 7),
  "Trimestre 3": PREVIOUS_EVALUATION_DATES.slice(7, 10),
};

const EVAL_TYPE_LABELS = ["contrôle", "devoir", "composition"] as const;

function attendanceProfile(classIndex: number) {
  const profiles = [
    { absence: 0.025, late: 0.025 },
    { absence: 0.015, late: 0.02 },
    { absence: 0.045, late: 0.06 },
    { absence: 0.035, late: 0.035 },
    { absence: 0.055, late: 0.04 },
    { absence: 0.075, late: 0.065 },
    { absence: 0.02, late: 0.03 },
    { absence: 0.09, late: 0.055 },
  ];
  return profiles[classIndex % profiles.length];
}

function deterministicChance(threshold: number, ...values: Array<string | number>) {
  return (stableNoise(...values) + 1) / 2 < threshold;
}

function demoScore(params: {
  classIndex: number;
  monthIndex: number;
  studentIndex: number;
  fullName: string;
  subjectName: string;
  previousYear?: boolean;
}) {
  const profile = classProfile(params.classIndex);
  const base = PROFILE_BASE[profile];
  const monthEffect = PROFILE_MONTH_EFFECTS[profile][params.monthIndex] ?? 0;
  const ability = studentAbility(params.studentIndex, params.fullName);
  const subject = SUBJECT_DIFFICULTY[params.subjectName] ?? 0;
  const noise = stableNoise(params.fullName, params.classIndex, params.monthIndex, params.subjectName) * 0.45;
  const previousAdjustment =
    params.previousYear
      ? profile === "recovering"
        ? 0.45
        : profile === "declining"
          ? -0.25
          : profile === "fatigue"
            ? -0.15
            : -0.25
      : 0;
  const score = base + monthEffect + ability + subject + noise + previousAdjustment;
  return Math.max(5.5, Math.min(18.2, Math.round(score * 10) / 10));
}

async function seedAcademics(
  admin: SupabaseClient,
  schoolId: string,
  classes: ClassRow[],
  subjects: Map<string, string>,
  students: Map<string, StudentRow>,
  teacherIdList: string[],
  currentTermId: string | undefined,
  options: { gradesHasTermId: boolean; termIds: Map<string, string> },
) {
  const subjectNames = Array.from(subjects.keys());

  for (const [classIndex, cls] of classes.entries()) {
    const { data: classStudents, error: studentsErr } = await admin
      .from("students")
      .select("id, full_name, class_id")
      .eq("school_id", schoolId)
      .eq("class_id", cls.id)
      .order("full_name", { ascending: true });
    if (studentsErr) throw studentsErr;
    const rows = (classStudents ?? []) as StudentRow[];
    if (rows.length === 0) continue;

    const subjectPool = subjectNames.filter((name) => subjectAppliesToLevel(name, cls.level));

    // Current year: one evaluation per subject per term (two for core subjects).
    for (const termName of ["Trimestre 1", "Trimestre 2", "Trimestre 3"] as const) {
      const evaluationTermId = options.termIds.get(termName) ?? currentTermId ?? null;
      const termDates = TERM_EVALUATION_DATES[termName];

      for (const [subjectIndex, subjectName] of subjectPool.entries()) {
        const subjectId = subjects.get(subjectName);
        if (!subjectId) continue;
        const evalsForSubject = subjectName === "Mathématiques" || subjectName === "Français" ? 2 : 1;

        for (let evalNum = 0; evalNum < evalsForSubject; evalNum += 1) {
          const monthIndex = CURRENT_EVALUATION_DATES.indexOf(termDates[(subjectIndex + evalNum) % termDates.length]);
          const date = termDates[(subjectIndex + evalNum) % termDates.length];
          const { data: evaluation, error: evalErr } = await admin
            .from("evaluations")
            .insert({
              school_id: schoolId,
              class_id: cls.id,
              subject_id: subjectId,
              title: `${subjectName} - ${EVAL_TYPE_LABELS[(subjectIndex + evalNum) % EVAL_TYPE_LABELS.length]} ${evalNum + 1}`,
              max_score: 20,
              evaluation_date: date,
              coefficient: subjectName === "Mathématiques" || subjectName === "Français" ? 2 : 1,
              term_id: evaluationTermId,
              teacher_id: teacherIdList[(classIndex + subjectIndex) % Math.max(1, teacherIdList.length)] ?? null,
            } as never)
            .select("id")
            .single();
          if (evalErr || !evaluation) throw evalErr;

          const { error: gradeErr } = await admin.from("grades").insert(
            rows.map((student, studentIndex) => ({
              school_id: schoolId,
              evaluation_id: (evaluation as { id: string }).id,
              student_id: student.id,
              ...(options.gradesHasTermId ? { term_id: evaluationTermId } : {}),
              score: demoScore({
                classIndex,
                monthIndex: monthIndex >= 0 ? monthIndex : subjectIndex,
                studentIndex,
                fullName: student.full_name,
                subjectName,
              }),
            })) as never,
          );
          if (gradeErr) throw new Error(`grades current: ${gradeErr.message}`);
        }
      }
    }

    // Previous year reference data (lighter: one eval per subject for T1/T2 only).
    for (const termName of ["Trimestre 1", "Trimestre 2"] as const) {
      const termDates = PREVIOUS_TERM_EVALUATION_DATES[termName];
      for (const [subjectIndex, subjectName] of subjectPool.entries()) {
        const subjectId = subjects.get(subjectName);
        if (!subjectId) continue;
        const monthIndex = PREVIOUS_EVALUATION_DATES.indexOf(termDates[subjectIndex % termDates.length]);
        const date = termDates[subjectIndex % termDates.length];
        const { data: evaluation, error: evalErr } = await admin
          .from("evaluations")
          .insert({
            school_id: schoolId,
            class_id: cls.id,
            subject_id: subjectId,
            title: `${subjectName} - référence N-1`,
            max_score: 20,
            evaluation_date: date,
            coefficient: 1,
            term_id: null,
            teacher_id: teacherIdList[(classIndex + subjectIndex) % Math.max(1, teacherIdList.length)] ?? null,
          } as never)
          .select("id")
          .single();
        if (evalErr || !evaluation) throw evalErr;

        const { error: gradeErr } = await admin.from("grades").insert(
          rows.map((student, studentIndex) => ({
            school_id: schoolId,
            evaluation_id: (evaluation as { id: string }).id,
            student_id: student.id,
            ...(options.gradesHasTermId ? { term_id: null } : {}),
            score: demoScore({
              classIndex,
              monthIndex: monthIndex >= 0 ? monthIndex : subjectIndex,
              studentIndex,
              fullName: student.full_name,
              subjectName,
              previousYear: true,
            }),
          })) as never,
        );
        if (gradeErr) throw new Error(`grades previous: ${gradeErr.message}`);
      }
    }

    const attendance = attendanceProfile(classIndex);
    const attendanceRows = RECENT_ATTENDANCE_DATES.flatMap((date, dateIndex) =>
      rows.map((student, studentIndex) => {
        const isAwaToday = student.full_name === "Awa Koné" && date === REFERENCE_DATE;
        const isYaoToday = student.full_name === "Yao Kouamé" && date === REFERENCE_DATE;
        const isLinaMedical = student.full_name === "Lina Traoré" && date === "2026-06-23";
        const isRiskStudent = RISK_BY_NAME.has(student.full_name);
        const absenceThreshold = attendance.absence + (isRiskStudent ? 0.06 : 0) + (dateIndex === 4 ? 0.015 : 0);
        const lateThreshold = attendance.late + (isRiskStudent ? 0.035 : 0) + (dateIndex === 7 ? 0.02 : 0);
        const absent = isAwaToday || isLinaMedical || deterministicChance(absenceThreshold, "absent", student.id, date, classIndex);
        const late = !absent && (isYaoToday || deterministicChance(lateThreshold, "late", student.id, date, classIndex));
        return {
          school_id: schoolId,
          class_id: cls.id,
          student_id: student.id,
          status: absent ? "ABSENT" : late || isYaoToday ? "LATE" : "PRESENT",
          date,
          reason: isAwaToday
            ? "Justificatif attendu"
            : isYaoToday
              ? "Transport"
              : isLinaMedical
                ? "Rendez-vous médical"
                : late
                  ? studentIndex % 3 === 0
                    ? "Transport"
                    : "Retard"
                  : null,
          justified: isYaoToday || isLinaMedical || (absent && isRiskStudent && studentIndex % 2 === 0),
        };
      }),
    );
    await admin.from("attendance").insert(attendanceRows as never);
  }
}

function fallbackAverage(classIndex: number, studentIndex: number) {
  const base = 10.6 + (classIndex % 5) * 0.45 + (studentIndex % 9) * 0.18;
  const drag = classIndex % 6 === 0 ? -1.4 : classIndex % 4 === 0 ? -0.6 : 0;
  return Math.max(7, Math.min(17.5, Math.round((base + drag) * 10) / 10));
}

function fallbackAttendance(classIndex: number, studentIndex: number) {
  const value = 91 - ((classIndex + studentIndex) % 8) * 1.8;
  return Math.max(72, Math.min(98, Math.round(value * 10) / 10));
}

function computeRisk(average: number, attendance: number): RiskLevel {
  if (average < 8 || attendance < 75) return "HIGH";
  if (average < 11 || attendance < 85) return "MEDIUM";
  return "LOW";
}

async function insertOptional(admin: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await admin.from(table).insert(rows as never);
  if (error && !isMissingRelationError(error)) throw new Error(`${table}: ${error.message}`);
}

async function hasColumn(admin: SupabaseClient, table: string, column: string) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return true;
  if (String(error.code) === "PGRST204" || /schema cache|does not exist|column/i.test(String(error.message))) {
    return false;
  }
  throw error;
}

async function seedAcademicSignals(admin: SupabaseClient, schoolId: string, classes: ClassRow[], students: Map<string, StudentRow>) {
  const classIndexById = new Map(classes.map((cls, index) => [cls.id, index]));
  const allStudents = Array.from(students.values()).sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
  const metricRows: Record<string, unknown>[] = [];
  const profileRows: Record<string, unknown>[] = [];
  const insightRows: Record<string, unknown>[] = [];

  for (const [studentIndex, student] of allStudents.entries()) {
    const override = RISK_BY_NAME.get(student.full_name);
    const classIndex = classIndexById.get(student.class_id) ?? 0;
    const average = override?.average ?? fallbackAverage(classIndex, studentIndex);
    const attendance = override?.attendance ?? fallbackAttendance(classIndex, studentIndex);
    const trend = override?.trend ?? (average < 10.5 ? "DECLINING" : studentIndex % 9 === 0 ? "IMPROVING" : "STABLE");
    const risk = override?.risk ?? computeRisk(average, attendance);
    const alert = override?.alert ?? (risk === "HIGH" || (risk === "MEDIUM" && studentIndex % 3 === 0));
    const riskScore = risk === "HIGH" ? 88 : risk === "MEDIUM" ? 62 : 24;

    metricRows.push({
      school_id: schoolId,
      student_id: student.id,
      average_score: average,
      attendance_rate: attendance,
      performance_trend: trend,
      risk_level: risk,
      alert_flag: alert,
      computed_at: at(REFERENCE_DATE, "12:00"),
    });

    profileRows.push({
      school_id: schoolId,
      student_id: student.id,
      weak_subjects: risk === "LOW" ? [] : ["Mathématiques", classIndex % 2 === 0 ? "Physique-Chimie" : "Français"],
      strong_subjects: risk === "HIGH" ? ["Anglais"] : ["SVT", "Histoire-Géographie"],
      risk_level: risk.toLowerCase(),
      attendance_risk_score: Math.max(0, Math.round((100 - attendance) * 10) / 10),
      academic_risk_score: riskScore,
      suggested_focus_areas: risk === "HIGH" ? ["équations", "méthode de travail", "assiduité"] : ["révision ciblée", "exercices guidés"],
      last_computed_at: at(REFERENCE_DATE, "12:15"),
    });

    if (alert || risk === "HIGH") {
      insightRows.push({
        school_id: schoolId,
        student_id: student.id,
        type: attendance < 80 ? "attendance_risk" : "academic_risk",
        title: attendance < 80 ? "Absences répétées détectées" : "Baisse académique détectée",
        description:
          attendance < 80
            ? "Plusieurs absences ou retards récents nécessitent un suivi avec la famille."
            : "Les dernières performances indiquent un risque de décrochage. Un accompagnement ciblé est recommandé.",
        severity: risk === "HIGH" ? "high" : "medium",
        created_at: at(REFERENCE_DATE, studentIndex % 2 === 0 ? "10:30" : "14:10"),
      });
    }
  }

  await insertOptional(admin, "academic_metrics", metricRows);
  await insertOptional(admin, "student_learning_profiles", profileRows);
  await insertOptional(admin, "ai_insights", insightRows);
}

async function seedDemoSupplyList(admin: SupabaseClient, schoolId: string, classes: ClassRow[]) {
  const cls = classes.find((c) => c.name === "6ème B");
  if (!cls) return;

  const productIds = new Map<string, string>();
  for (const product of DEMO_SUPPLY_PRODUCTS) {
    const { data: existing, error: existingErr } = await admin
      .from("store_products")
      .select("id")
      .eq("school_id", schoolId)
      .eq("name", product.name)
      .maybeSingle();
    if (existingErr) {
      if (isMissingRelationError(existingErr)) return;
      throw existingErr;
    }
    if (existing?.id) {
      productIds.set(product.name, String(existing.id));
      continue;
    }
    const { data, error } = await admin
      .from("store_products")
      .insert({
        school_id: schoolId,
        name: product.name,
        category: product.category,
        price: product.price,
        is_active: true,
      } as never)
      .select("id")
      .single();
    if (error) {
      if (isMissingRelationError(error)) return;
      throw error;
    }
    productIds.set(product.name, String((data as { id: string }).id));
  }

  const title = `Liste de fournitures - ${cls.name}`;
  const { data: existingList, error: listLookupErr } = await admin
    .from("supply_lists")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_id", cls.id)
    .eq("academic_year", DEMO_ACADEMIC_YEAR)
    .eq("title", title)
    .maybeSingle();
  if (listLookupErr) {
    if (isMissingRelationError(listLookupErr)) return;
    throw listLookupErr;
  }

  let listId = (existingList as { id?: string } | null)?.id;
  if (!listId) {
    const { data, error } = await admin
      .from("supply_lists")
      .insert({
        school_id: schoolId,
        class_id: cls.id,
        title,
        academic_year: DEMO_ACADEMIC_YEAR,
        status: "draft",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    listId = String((data as { id: string }).id);
  } else {
    await admin.from("supply_lists").update({ status: "draft" } as never).eq("id", listId);
  }

  const { data: existingItems, error: itemsErr } = await admin
    .from("supply_list_items")
    .select("name")
    .eq("supply_list_id", listId);
  if (itemsErr) throw itemsErr;
  const existingNames = new Set(((existingItems ?? []) as Array<{ name: string }>).map((i) => i.name));
  const missing = SERGE_SUPPLY_LIST_ITEMS.filter((item) => !existingNames.has(item.name));
  if (missing.length === 0) return;

  const { error: insertErr } = await admin.from("supply_list_items").insert(
    missing.map((item) => ({
      supply_list_id: listId,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
      recommended_product_id: productIds.get(item.name) ?? null,
    })) as never,
  );
  if (insertErr) throw insertErr;
}

async function seedFinanceAndStore(admin: SupabaseClient, schoolId: string, students: Map<string, StudentRow>) {
  const feeRows = [
    ["Awa Koné", 45000, "Frais de scolarité juin", false],
    ["Yao Kouamé", 25000, "Cantine juin", false],
    ["Lina Traoré", 30000, "Frais d'examen", true],
  ] as const;
  for (const [studentName, amount, , paid] of feeRows) {
    const student = students.get(studentName);
    if (!student) continue;
    const { data: fee, error } = await admin
      .from("student_fees")
      .insert({ school_id: schoolId, student_id: student.id, amount_due: amount, academic_year: DEMO_ACADEMIC_YEAR } as never)
      .select("id")
      .single();
    if (error || !fee) throw error;
    if (paid) {
      await admin.from("payments").insert({
        school_id: schoolId,
        student_id: student.id,
        student_fee_id: (fee as { id: string }).id,
        amount,
        method: "cash",
        status: "paid",
        receipt_no: `DEMO-${student.id.slice(0, 8)}`,
        paid_at: at("2026-06-18", "10:00"),
      } as never);
    }
  }

  const eli = students.get("Eli Tuo");
  if (!eli) return;
  const { data: product } = await admin.from("store_products").insert({ school_id: schoolId, name: "Pack fournitures 6ème B", category: "Packs", price: 28500, is_active: true } as never).select("id").single();
  const { data: pack } = await admin.from("store_packs").insert({ school_id: schoolId, class_id: eli.class_id, title: "Pack fournitures 6ème B", price: 28500, type: "recommended", status: "published" } as never).select("id").single();
  if (pack) {
    await admin.from("store_pack_items").insert({ pack_id: (pack as { id: string }).id, product_id: (product as { id?: string } | null)?.id ?? null, name: "Pack fournitures 6ème B", quantity: 1, unit_price: 28500 } as never);
    const { data: parentLink } = await admin.from("student_parents").select("parent_id").eq("student_id", eli.id).maybeSingle();
    if (parentLink) {
      await admin.from("store_orders").insert({ school_id: schoolId, parent_id: (parentLink as { parent_id: string }).parent_id, student_id: eli.id, class_id: eli.class_id, pack_id: (pack as { id: string }).id, total_amount: 28500, payment_status: "pending", order_status: "pending", pickup_location: "Retrait à l'école" } as never);
    }
  }
}

async function createConversation(admin: SupabaseClient, params: { schoolId: string; title: string; type: string; student?: StudentRow; classId?: string; participants: string[]; messages: Array<{ senderId: string | null; senderRole: string; content: string; type?: string; createdAt: string; metadata?: Record<string, unknown> }> }) {
  const { data: conv, error } = await admin
    .from("conversations")
    .insert({ school_id: params.schoolId, title: params.title, type: params.type, student_id: params.student?.id ?? null, class_id: params.classId ?? params.student?.class_id ?? null, is_demo: true, last_message_at: params.messages.at(-1)?.createdAt ?? at(REFERENCE_DATE, "08:00") } as never)
    .select("id")
    .single();
  if (error || !conv) throw error;
  const conversationId = (conv as { id: string }).id;
  await admin.from("conversation_participants").insert(params.participants.map((userId) => ({ conversation_id: conversationId, participant_type: "USER", user_id: userId, class_id: null })) as never);
  await admin.from("messages").insert(params.messages.map((m) => ({ conversation_id: conversationId, sender_id: m.senderId, sender_role: m.senderRole, content: m.content, type: m.type ?? "text", metadata: m.metadata ?? null, is_demo: true, created_at: m.createdAt })) as never);
}

async function seedMessages(admin: SupabaseClient, schoolId: string, students: Map<string, StudentRow>, userIds: Map<string, string>) {
  const adminId = userIds.get("admin.abidjan@seed-elima.invalid")!;
  const serge = userIds.get("enseignant.serge@elima.school")!;
  const nadia = userIds.get("enseignant.nadia@elima.school")!;
  const mariam = userIds.get("parent.mariam@elima.school")!;
  const jean = userIds.get("parent.jean@elima.school")!;
  const aminata = userIds.get("parent.aminata@elima.school")!;
  const aboubacar = userIds.get("parent.aboubacar@elima.school")!;
  const eliUser = userIds.get("eleve.eli@elima.school")!;
  const linaUser = userIds.get("eleve.lina@elima.school")!;

  await createConversation(admin, {
    schoolId,
    title: "Absence de Awa Koné - 6ème B",
    type: "absence_notification",
    student: students.get("Awa Koné"),
    participants: [serge, mariam, adminId],
    messages: [
      { senderId: null, senderRole: "SYSTEM", content: "Absence signalée : Awa Koné est absente ce matin de 08h00 à 10h00. Merci de transmettre un justificatif.", type: "absence_alert", createdAt: at("2026-06-25", "08:20") },
      { senderId: serge, senderRole: "TEACHER", content: "Bonjour Mme Koné, Awa n'est pas présente en classe ce matin. Pouvez-vous nous confirmer si tout va bien ?", createdAt: at("2026-06-25", "08:32") },
      { senderId: mariam, senderRole: "PARENT", content: "Bonjour Monsieur, elle avait un rendez-vous médical. Je vous enverrai le justificatif dans la journée.", createdAt: at("2026-06-25", "08:45") },
      { senderId: serge, senderRole: "TEACHER", content: "Merci pour votre retour. Je mets l'absence en attente de justificatif.", createdAt: at("2026-06-25", "08:48") },
    ],
  });

  await createConversation(admin, {
    schoolId,
    title: "Nouvelle note - Mathématiques",
    type: "grade_notification",
    student: students.get("Eli Tuo"),
    participants: [serge, aboubacar, eliUser],
    messages: [
      { senderId: null, senderRole: "SYSTEM", content: "Nouvelle note publiée : Eli Tuo a obtenu 18/20 en Mathématiques.", type: "grade_alert", createdAt: at("2026-06-20", "17:05") },
      { senderId: serge, senderRole: "TEACHER", content: "Bonsoir, très bon travail d'Eli sur l'évaluation de mathématiques. Il progresse bien et participe davantage en classe.", createdAt: at("2026-06-20", "17:12") },
      { senderId: aboubacar, senderRole: "PARENT", content: "Merci Monsieur, je vais l'encourager à continuer dans ce sens.", createdAt: at("2026-06-20", "18:20") },
    ],
  });

  await createConversation(admin, {
    schoolId,
    title: "Paiement en attente - Frais de scolarité",
    type: "payment_reminder",
    student: students.get("Awa Koné"),
    participants: [adminId, mariam],
    messages: [
      { senderId: null, senderRole: "SYSTEM", content: "Rappel de paiement : les frais de scolarité de juin pour Awa Koné sont en attente. Montant : 45 000 FCFA. Échéance : 30 juin 2026.", type: "payment_link", createdAt: at("2026-06-25", "09:00"), metadata: { href: "/parent" } },
      { senderId: adminId, senderRole: "SCHOOL_ADMIN", content: "Bonjour Mme Koné, vous pouvez régler les frais de scolarité directement depuis Elima via le lien sécurisé ci-dessous.", createdAt: at("2026-06-25", "09:05") },
    ],
  });

  await createConversation(admin, {
    schoolId,
    title: "Retard de Yao Kouamé",
    type: "absence_notification",
    student: students.get("Yao Kouamé"),
    participants: [serge, jean],
    messages: [
      { senderId: null, senderRole: "SYSTEM", content: "Retard signalé : Yao Kouamé est arrivé à 08h15.", type: "absence_alert", createdAt: at("2026-06-25", "08:18") },
      { senderId: jean, senderRole: "PARENT", content: "Bonjour Monsieur, Yao a eu un problème de transport ce matin. Merci pour votre compréhension.", createdAt: at("2026-06-25", "08:25") },
      { senderId: serge, senderRole: "TEACHER", content: "Bonjour Monsieur Kouamé, merci pour votre retour. Le retard est marqué comme justifié.", createdAt: at("2026-06-25", "08:30") },
    ],
  });

  await createConversation(admin, {
    schoolId,
    title: "Pack fournitures 6ème B disponible",
    type: "store_order",
    student: students.get("Eli Tuo"),
    participants: [adminId, aboubacar],
    messages: [
      { senderId: null, senderRole: "SYSTEM", content: "Le pack fournitures recommandé pour Eli Tuo en 6ème B est disponible sur Elima Store.", type: "store_link", createdAt: at("2026-06-25", "11:00"), metadata: { href: "/parent/store" } },
      { senderId: adminId, senderRole: "SCHOOL_ADMIN", content: "Bonjour M. Tuo, vous pouvez commander le pack de fournitures 6ème B directement depuis Elima. Le retrait se fera à l'école.", createdAt: at("2026-06-25", "11:03") },
    ],
  });

  await createConversation(admin, {
    schoolId,
    title: "Encouragement - Français",
    type: "teacher_student",
    student: students.get("Lina Traoré"),
    participants: [nadia, linaUser, aminata],
    messages: [
      { senderId: nadia, senderRole: "TEACHER", content: "Bonjour Lina, très bon travail sur ton devoir de français. Continue à structurer tes réponses comme tu l'as fait.", createdAt: at("2026-06-20", "16:15") },
      { senderId: linaUser, senderRole: "STUDENT", content: "Merci Madame, je vais continuer à m'entraîner.", createdAt: at("2026-06-20", "18:05") },
    ],
  });

  await admin.from("notifications").insert([
    { school_id: schoolId, student_id: students.get("Awa Koné")?.id, type: "ABSENCE_ALERT", channel: "INTERNAL", message: "Absence de Awa Koné à justifier.", status: "SENT", sent_at: at("2026-06-25", "08:20"), created_at: at("2026-06-25", "08:20") },
    { school_id: schoolId, student_id: students.get("Eli Tuo")?.id, type: "GRADE_PUBLISHED", channel: "INTERNAL", message: "Eli Tuo a obtenu 18/20 en Mathématiques.", status: "SENT", sent_at: at("2026-06-20", "17:05"), created_at: at("2026-06-20", "17:05") },
  ] as never);
}

async function main() {
  assertDemoMode();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  const admin = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const gradesHasTermId = await hasColumn(admin, "grades", "term_id");

  const structures = new Map<string, Awaited<ReturnType<typeof seedSchoolStructure>>>();
  for (const school of DEMO_SCHOOLS) {
    structures.set(school.id, await seedSchoolStructure(admin, school));
  }

  const { userIds, teacherIds } = await seedUsers(admin);
  for (const school of DEMO_SCHOOLS) {
    const structure = structures.get(school.id);
    if (!structure) throw new Error(`Missing demo structure for ${school.name}`);
    const { classes, subjects, currentTermId, termIds } = structure;
    const schoolTeacherIds = Array.from(DEMO_ACCOUNTS)
      .filter((a) => a.schoolId === school.id && a.role === "TEACHER")
      .map((a) => teacherIds.get(a.email))
      .filter((id): id is string => Boolean(id));
    await seedTeachingAssignments(admin, school.id, classes, subjects, schoolTeacherIds.length ? schoolTeacherIds : Array.from(teacherIds.values()));
    await seedTimetableEvents(admin, school, classes, subjects, teacherIds);
    const students = await seedStudents(admin, school, classes, userIds);
    await seedAcademics(admin, school.id, classes, subjects, students, schoolTeacherIds.length ? schoolTeacherIds : Array.from(teacherIds.values()), currentTermId, { gradesHasTermId, termIds });
    await seedAcademicSignals(admin, school.id, classes, students);
    if (school.principal) {
      await seedFinanceAndStore(admin, school.id, students);
      await seedDemoSupplyList(admin, school.id, classes);
      await seedMessages(admin, school.id, students, userIds);
    }
  }

  console.log(`[seed:demo] Demo seeded for ${DEMO_SCHOOLS.length} school(s). Password: ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error("[seed:demo] Fatal:", error);
  process.exit(1);
});
