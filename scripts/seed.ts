/**
 * Seed Supabase with realistic fictitious data for eLIMA ERP (local / staging).
 *
 * Prerequisites:
 *   1. Apply migration: supabase/migrations/20260215180000_seed_elima_extensions.sql
 *      (Supabase CLI: `supabase db push` or paste SQL in SQL editor.)
 *   2. Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 *      Loaded from project root: .env then .env.local (Next.js style; .env.local wins).
 *
 * Usage:
 *   npm run seed
 *   npm run seed:reset
 *
 * Does NOT create quizzes, revision modules, or pedagogical content.
 */

import path from "node:path";
import fs from "node:fs";
import { config as dotenvConfig } from "dotenv";
import { faker } from "@faker-js/faker";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const _root = process.cwd();
dotenvConfig({ path: path.join(_root, ".env") });
dotenvConfig({ path: path.join(_root, ".env.local"), override: true });

const SEED_META_KEY = "seed_elima";
const ACADEMIC_YEAR = "2025-2026";
const DEMO_AUTH_PASSWORD = process.env.SEED_AUTH_PASSWORD || "ElimaSeed!2026";

/** Fixed school IDs so --reset can target data reliably. */
const SEED_SCHOOL_IDS = {
  cma: "a1111111-1111-4111-8111-111111110001",
  iey: "a1111111-1111-4111-8111-111111110002",
  gslc: "a1111111-1111-4111-8111-111111110003",
  csa: "a1111111-1111-4111-8111-111111110004",
  iplp: "a1111111-1111-4111-8111-111111110005",
} as const;

const SCHOOL_SPECS = [
  {
    id: SEED_SCHOOL_IDS.cma,
    name: "Collège Moderne d’Abidjan",
    city: "Abidjan",
    motto: "L’excellence notre objectif",
    plan: "premium",
    currency: "XOF",
  },
  {
    id: SEED_SCHOOL_IDS.iey,
    name: "Institut Excellence Yamoussoukro",
    city: "Yamoussoukro",
    motto: "Discipline - Travail - Réussite",
    plan: "basic",
    currency: "XOF",
  },
  {
    id: SEED_SCHOOL_IDS.gslc,
    name: "Groupe Scolaire La Concorde",
    city: "Bouaké",
    motto: "Éduquer aujourd’hui pour bâtir demain",
    plan: "custom",
    currency: "XOF",
  },
  {
    id: SEED_SCHOOL_IDS.csa,
    name: "Collège Saint-Augustin",
    city: "Anyama",
    motto: "Foi - Savoir - Service",
    plan: "basic",
    currency: "XOF",
  },
  {
    id: SEED_SCHOOL_IDS.iplp,
    name: "Institut Polyvalent Le Progrès",
    city: "San-Pédro",
    motto: "Travail - Discipline - Réussite",
    plan: "premium",
    currency: "XOF",
  },
] as const;

const SUBJECT_NAMES = [
  "Mathématiques",
  "Français",
  "Anglais",
  "Physique-Chimie",
  "SVT",
  "Histoire-Géographie",
  "Philosophie",
  "Espagnol",
  "Informatique",
] as const;

/** Levels with relative weights for assigning students (higher = more students). */
const LEVEL_WEIGHTS: Record<string, number> = {
  "6ème": 22,
  "5ème": 20,
  "4ème": 18,
  "3ème": 10,
  "2nde A": 6,
  "2nde C": 6,
  "1ère A": 4,
  "1ère C": 4,
  "1ère D": 4,
  "Terminale A": 2,
  "Terminale C": 2,
  "Terminale D": 2,
};

const LEVELS = Object.keys(LEVEL_WEIGHTS);

/** Class templates (name + level) — varied per school by rotation. */
const CLASS_BLUEPRINTS: { name: string; level: string }[] = [
  { name: "6ème A", level: "6ème" },
  { name: "6ème B", level: "6ème" },
  { name: "6ème C", level: "6ème" },
  { name: "5ème A", level: "5ème" },
  { name: "5ème B", level: "5ème" },
  { name: "4ème A", level: "4ème" },
  { name: "4ème B", level: "4ème" },
  { name: "3ème A", level: "3ème" },
  { name: "2nde A", level: "2nde A" },
  { name: "2nde C1", level: "2nde C" },
  { name: "1ère A", level: "1ère A" },
  { name: "1ère D", level: "1ère D" },
  { name: "Terminale C", level: "Terminale C" },
  { name: "Terminale D", level: "Terminale D" },
];

const FIRST_NAMES = [
  "Koffi",
  "Aminata",
  "Yao",
  "Fatou",
  "Mamadou",
  "Adjoua",
  "Kouassi",
  "Binta",
  "Ibrahim",
  "Akissi",
  "Sékou",
  "Mariam",
  "Kwame",
  "Aïcha",
  "Kader",
  "N’Guessan",
  "Habib",
  "Salimata",
  "Emmanuel",
  "Grace",
  "Patrick",
  "Béatrice",
  "Oumar",
  "Rokiatou",
  "Jean-Baptiste",
];

const LAST_NAMES = [
  "Koné",
  "Traoré",
  "Yao",
  "Diallo",
  "Ouattara",
  "Kouamé",
  "Touré",
  "Camara",
  "Sangaré",
  "Bamba",
  "Gbaka",
  "N’Guessan",
  "Amani",
  "Coulibaly",
  "Diabaté",
  "Fofana",
  "Kaba",
  "Soro",
  "Zongo",
  "Ouédraogo",
  "Said",
  "Mensah",
  "Addy",
  "Owusu",
];

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function createServiceClient(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!url) throw new Error("Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function waitForTeacherRow(supabase: SupabaseClient, userId: string): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    const { data, error } = await supabase.from("teachers").select("id").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Trigger on_auth_user_created did not create teachers row in time.");
}

async function createAuthUser(
  supabase: SupabaseClient,
  payload: {
    email: string;
    role: "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
    schoolId: string;
    fullName: string;
    phone: string;
  },
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: DEMO_AUTH_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: payload.role,
      school_id: payload.schoolId,
      full_name: payload.fullName,
      phone: payload.phone,
      [SEED_META_KEY]: true,
    },
  });
  if (error || !data.user) throw new Error(`auth user (${payload.email}): ${error?.message}`);
  return data.user.id;
}

function ivorianMobile(): string {
  const prefix = faker.helpers.arrayElement(["01", "05", "07"]);
  const a = faker.string.numeric(2);
  const b = faker.string.numeric(2);
  const c = faker.string.numeric(2);
  const d = faker.string.numeric(2);
  return `+225 ${prefix} ${a} ${b} ${c} ${d}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertBatched<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  batchSize = 400,
): Promise<number> {
  let n = 0;
  for (const part of chunk(rows, batchSize)) {
    const { error } = await supabase.from(table).insert(part as never);
    if (error) throw new Error(`${table} insert: ${error.message}`);
    n += part.length;
  }
  return n;
}

async function hasColumn(supabase: SupabaseClient, table: string, column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  const msg = error.message ?? "";
  const code = (error as { code?: string }).code ?? "";
  const missing =
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "42P01" ||
    /Could not find the table/i.test(msg) ||
    /Could not find the .* column/i.test(msg) ||
    /column .* does not exist/i.test(msg);
  if (missing) return false;
  throw new Error(`Unable to inspect ${table}.${column}: ${msg}`);
}

async function assertExtensions(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from("student_payments").select("id").limit(1);
  if (error?.message?.includes("does not exist") || error?.code === "42P01") {
    throw new Error(
      "Table student_payments missing. Apply supabase/migrations/20260215180000_seed_elima_extensions.sql first.",
    );
  }
}

async function deleteSeedSchools(supabase: SupabaseClient, schoolIds: string[]): Promise<void> {
  const log = (m: string) => console.log(`  [reset] ${m}`);
  if (schoolIds.length === 0) return;

  // Collect all auth-linked app users for seeded schools.
  const { data: userRows, error: uErr } = await supabase
    .from("users")
    .select("id")
    .in("school_id", schoolIds);
  if (uErr) throw uErr;
  const authUserIds = [...new Set((userRows ?? []).map((r) => r.id as string).filter(Boolean))];

  // Generic delete-by-school_id helper. Only use for tables that actually have school_id.
  // Tolerates tables that are not present in the current database (some optional ones
  // from schema.sql may not have been deployed).
  const delBySchool = async (table: string, column = "school_id") => {
    const { error } = await supabase.from(table).delete().in(column, schoolIds);
    if (error) {
      const msg = error.message ?? "";
      const code = (error as { code?: string }).code ?? "";
      const tableMissing =
        code === "PGRST205" ||
        code === "42P01" ||
        /Could not find the table/i.test(msg) ||
        /does not exist/i.test(msg);
      if (tableMissing) {
        log(`${table} (skipped — table absent)`);
        return;
      }
      throw new Error(`delete ${table}: ${msg}`);
    }
    log(table);
  };

  // 1) Data tables that all carry school_id. Order: children before parents at the FK level.
  await delBySchool("ai_insights");
  await delBySchool("student_learning_profiles");
  await delBySchool("student_payments");
  await delBySchool("whatsapp_messages");
  await delBySchool("grades");
  await delBySchool("student_term_summaries");
  await delBySchool("academic_metrics");
  await delBySchool("reports");
  await delBySchool("notifications");
  await delBySchool("homeworks");
  await delBySchool("attendance");
  await delBySchool("timetable_events");
  await delBySchool("teacher_todos");
  await delBySchool("teacher_memos");
  await delBySchool("evaluations");

  // 2) Conversations → their messages & participants cascade on conversation deletion.
  await delBySchool("conversations");

  // 3) students cascades student_parents; parents cascades student_parents too.
  //    student_parents itself has no school_id — handled by cascade above.
  await delBySchool("students");
  await delBySchool("parents");

  // 4) teachers cascades class_teachers and teacher_subject_classes (no school_id columns there).
  await delBySchool("teachers");

  // 5) Now delete the underlying auth.users for those app users.
  let authDeleted = 0;
  for (const uid of authUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error && !/User not found/i.test(error.message)) {
      throw new Error(`auth.admin.deleteUser(${uid}): ${error.message}`);
    }
    authDeleted += 1;
  }
  log(`auth users removed: ${authDeleted}`);

  // 6) Curriculum & structural tables.
  await delBySchool("level_subjects");
  await delBySchool("subjects");
  await delBySchool("classes");

  // schools.current_term_id references terms; null it out before removing terms.
  // (Column may not exist on partial schemas — ignore gracefully.)
  {
    const { error: clearTermErr } = await supabase
      .from("schools")
      .update({ current_term_id: null })
      .in("id", schoolIds);
    if (clearTermErr) {
      const msg = clearTermErr.message ?? "";
      const colMissing = /Could not find the .* column/i.test(msg) || /column .* does not exist/i.test(msg);
      if (!colMissing) throw new Error(`clear current_term_id: ${msg}`);
      log("schools.current_term_id (skipped — column absent)");
    } else {
      log("schools.current_term_id cleared");
    }
  }

  await delBySchool("terms");

  // audit_logs.school_id is ON DELETE SET NULL → it won't be cascaded; clean explicitly.
  await delBySchool("audit_logs");

  await delBySchool("schools", "id");

  log("done.");
}

type SchoolCtx = {
  spec: (typeof SCHOOL_SPECS)[number];
  termIds: [string, string, string];
  subjectIds: Record<string, string>;
  classRows: { id: string; name: string; level: string; capacity: number }[];
  teacherIds: string[];
  teacherUserIds: string[];
};

type DemoAuthCredential = {
  email: string;
  password: string;
  role: "SCHOOL_ADMIN" | "PARENT" | "STUDENT";
  school: string;
};

function writeDemoAuthAccountsFile(accounts: DemoAuthCredential[]) {
  const outputPath = path.join(process.cwd(), "scripts", "seed-auth-accounts.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    password: DEMO_AUTH_PASSWORD,
    accounts,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

type Perf = "excellent" | "average" | "weak" | "declining" | "improving";

function pickPerf(seed: number): Perf {
  const r = Math.abs(seed) % 100;
  if (r < 8) return "excellent";
  if (r < 18) return "weak";
  if (r < 24) return "declining";
  if (r < 30) return "improving";
  return "average";
}

function scoreForPerf(perf: Perf, evalIndex: number, termIndex: number): number {
  const base =
    perf === "excellent"
      ? 16 + faker.number.float({ min: 0, max: 4, fractionDigits: 1 })
      : perf === "weak"
        ? 4 + faker.number.float({ min: 0, max: 6, fractionDigits: 1 })
        : perf === "declining"
          ? Math.max(4, 14 - evalIndex * 0.35 - termIndex * 0.8 + faker.number.float({ min: -2, max: 2, fractionDigits: 1 }))
          : perf === "improving"
            ? Math.min(20, 9 + evalIndex * 0.4 + termIndex * 0.9 + faker.number.float({ min: -1.5, max: 2, fractionDigits: 1 }))
            : 9 + faker.number.float({ min: 0, max: 7, fractionDigits: 1 });
  return Math.round(Math.min(20, Math.max(0, base)) * 10) / 10;
}

async function seedSchool(supabase: SupabaseClient, spec: (typeof SCHOOL_SPECS)[number]): Promise<{
  ctx: SchoolCtx;
  studentRows: { id: string; class_id: string; school_id: string; perf: Perf; parent_phone: string }[];
  demoAuths: DemoAuthCredential[];
}> {
  const logoUrl = `https://placehold.co/320x120/png?text=${encodeURIComponent(spec.name.slice(0, 18))}`;

  const { error: sErr } = await supabase.from("schools").insert({
    id: spec.id,
    name: spec.name,
    country: "Côte d’Ivoire",
    city: spec.city,
    phone: ivorianMobile(),
    status: "private",
    motto: spec.motto,
    plan: spec.plan,
    logo_url: logoUrl,
    currency: spec.currency,
  } as never);
  if (sErr) throw new Error(`school ${spec.name}: ${sErr.message}`);

  const termNames = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];
  const termDates: [string, string][] = [
    ["2025-09-15", "2025-12-20"],
    ["2026-01-08", "2026-03-28"],
    ["2026-04-02", "2026-06-30"],
  ];
  const termIds: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const { data: t, error: te } = await supabase
      .from("terms")
      .insert({
        school_id: spec.id,
        name: termNames[i],
        start_date: termDates[i][0],
        end_date: termDates[i][1],
        is_closed: false,
      } as never)
      .select("id")
      .single();
    if (te || !t) throw new Error(`term: ${te?.message}`);
    termIds.push(t.id as string);
  }

  // Optional: point the school at its middle term (column may not exist on partial schemas).
  {
    const { error: setTermErr } = await supabase
      .from("schools")
      .update({ current_term_id: termIds[1] })
      .eq("id", spec.id);
    if (setTermErr) {
      const msg = setTermErr.message ?? "";
      const colMissing = /Could not find the .* column/i.test(msg) || /column .* does not exist/i.test(msg);
      if (!colMissing) throw new Error(`set current_term_id: ${msg}`);
    }
  }

  const subjectRows = SUBJECT_NAMES.map((name) => ({
    school_id: spec.id,
    name,
    coefficient: name === "Mathématiques" || name === "Français" ? 4 : faker.helpers.arrayElement([1, 1, 2, 2]),
  }));
  const { data: subIns, error: subErr } = await supabase.from("subjects").insert(subjectRows as never).select("id,name");
  if (subErr || !subIns) throw new Error(`subjects: ${subErr?.message}`);
  const subjectIds: Record<string, string> = {};
  for (const row of subIns as { id: string; name: string }[]) {
    subjectIds[row.name] = row.id;
  }

  const classCount = faker.number.int({ min: 9, max: CLASS_BLUEPRINTS.length });
  const blueprints = faker.helpers.shuffle([...CLASS_BLUEPRINTS]).slice(0, classCount);
  const classIns = blueprints.map((bp) => ({
    school_id: spec.id,
    name: bp.name,
    level: bp.level,
    academic_year: ACADEMIC_YEAR,
    capacity: faker.number.int({ min: 32, max: 48 }),
  }));
  const { data: clsData, error: clsErr } = await supabase.from("classes").insert(classIns as never).select("id,name,level,capacity");
  if (clsErr || !clsData) throw new Error(`classes: ${clsErr?.message}`);
  const classRows = clsData as { id: string; name: string; level: string; capacity: number }[];

  // Realistic teaching staff: at least one teacher per subject, then ~1.2 per class
  // (each subject usually has 2–4 teachers in a lycée covering ~10–14 classes).
  const minTeachers = Math.max(SUBJECT_NAMES.length + 4, Math.ceil(classRows.length * 1.6));
  const maxTeachers = Math.max(minTeachers + 6, Math.ceil(classRows.length * 2.4));
  const teacherCount = faker.number.int({ min: minTeachers, max: maxTeachers });
  const teacherIds: string[] = [];
  const teacherUserIds: string[] = [];
  const demoAuths: DemoAuthCredential[] = [];
  // Cycle through subjects so every subject is covered by at least one teacher,
  // additional teachers reinforce the most class-heavy subjects.
  const subjectCycle: string[] = [];
  for (let s = 0; s < teacherCount; s += 1) {
    subjectCycle.push(SUBJECT_NAMES[s % SUBJECT_NAMES.length]);
  }
  faker.helpers.shuffle(subjectCycle);

  const schoolSlug = spec.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const adminEmail = `admin.${schoolSlug}@seed-elima.invalid`;
  await createAuthUser(supabase, {
    email: adminEmail,
    role: "SCHOOL_ADMIN",
    schoolId: spec.id,
    fullName: `Admin ${spec.name}`,
    phone: ivorianMobile(),
  });
  demoAuths.push({ email: adminEmail, password: DEMO_AUTH_PASSWORD, role: "SCHOOL_ADMIN", school: spec.name });

  for (let i = 0; i < teacherCount; i += 1) {
    const fn = faker.helpers.arrayElement(FIRST_NAMES);
    const ln = faker.helpers.arrayElement(LAST_NAMES);
    const email = `seed.t.${spec.id.slice(0, 8)}.${i}.${faker.string.alphanumeric(8)}@seed-elima.invalid`;
    const phone = ivorianMobile();
    const primarySubject = subjectCycle[i];

    const userId = await createAuthUser(supabase, {
      email,
      role: "TEACHER",
      schoolId: spec.id,
      fullName: `${fn} ${ln}`,
      phone,
    });

    teacherUserIds.push(userId);

    const tid = await waitForTeacherRow(supabase, userId);
    teacherIds.push(tid);

    const { error: upTErr } = await supabase.from("teachers").update({ primary_subject: primarySubject }).eq("id", tid);
    if (upTErr) throw new Error(`teacher primary_subject: ${upTErr.message}`);
  }

  const targetStudents = faker.number.int({ min: 200, max: 800 });
  const weights = classRows.map((c) => LEVEL_WEIGHTS[c.level] ?? 5);
  const wSum = weights.reduce((a, b) => a + b, 0);

  const studentBulk: Record<string, unknown>[] = [];
  const studentMeta: { id: string; class_id: string; school_id: string; perf: Perf; parent_phone: string }[] = [];

  for (let n = 0; n < targetStudents; n += 1) {
    let r = faker.number.float({ min: 0, max: wSum });
    let idx = 0;
    for (let j = 0; j < weights.length; j += 1) {
      r -= weights[j];
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    const cls = classRows[idx];
    const fn = faker.helpers.arrayElement(FIRST_NAMES);
    const ln = faker.helpers.arrayElement(LAST_NAMES);
    const fullName = `${fn} ${ln}`;
    const gender = faker.helpers.arrayElement(["M", "F"] as const);
    const birth = faker.date.birthdate({ min: 11, max: 19, mode: "age" }).toISOString().slice(0, 10);
    const parentPhone = ivorianMobile();
    const sid = crypto.randomUUID();
    const perf = pickPerf(sid.split("-").reduce((acc, x) => acc + parseInt(x, 16), 0));

    studentBulk.push({
      id: sid,
      school_id: spec.id,
      class_id: cls.id,
      full_name: fullName,
      first_name: fn,
      last_name: ln,
      gender,
      birth_date: birth,
      status: "active",
      parent_name: `${faker.helpers.arrayElement(FIRST_NAMES)} ${faker.helpers.arrayElement(LAST_NAMES)}`,
      parent_phone: parentPhone,
      parent_email: `parent.${sid.slice(0, 8)}@seed-elima.invalid`,
      registration_number: `${spec.city.slice(0, 3).toUpperCase()}-${faker.string.numeric(5)}`,
    });
    studentMeta.push({ id: sid, class_id: cls.id, school_id: spec.id, perf, parent_phone: parentPhone });
  }

  await insertBatched(supabase, "students", studentBulk as never);

  const demoStudents = faker.helpers.arrayElements(studentBulk, Math.min(3, studentBulk.length)) as {
    id: string;
    full_name: string;
    parent_name: string;
    parent_phone: string;
    parent_email: string;
  }[];
  const studentsHasUserId = await hasColumn(supabase, "students", "user_id");
  const parentsHasUserId = await hasColumn(supabase, "parents", "user_id");
  const parentsHasEmail = await hasColumn(supabase, "parents", "email");
  const parentsHasFullName = await hasColumn(supabase, "parents", "full_name");
  const parentsHasPhone = await hasColumn(supabase, "parents", "phone");
  const canInsertParentRecord = parentsHasFullName && parentsHasPhone;
  const studentParentsTable = await hasColumn(supabase, "student_parents", "student_id");
  const studentParentsHasRelationship = await hasColumn(supabase, "student_parents", "relationship");

  for (let i = 0; i < demoStudents.length; i += 1) {
    const row = demoStudents[i];
    const studentEmail = `student.${schoolSlug}.${i + 1}@seed-elima.invalid`;
    const studentUserId = await createAuthUser(supabase, {
      email: studentEmail,
      role: "STUDENT",
      schoolId: spec.id,
      fullName: row.full_name,
      phone: ivorianMobile(),
    });
    if (studentsHasUserId) {
      const { error: studentLinkErr } = await supabase.from("students").update({ user_id: studentUserId }).eq("id", row.id);
      if (studentLinkErr) throw new Error(`student.user_id link: ${studentLinkErr.message}`);
    }
    demoAuths.push({ email: studentEmail, password: DEMO_AUTH_PASSWORD, role: "STUDENT", school: spec.name });

    const parentEmail = `parent.${schoolSlug}.${i + 1}@seed-elima.invalid`;
    const parentUserId = await createAuthUser(supabase, {
      email: parentEmail,
      role: "PARENT",
      schoolId: spec.id,
      fullName: row.parent_name,
      phone: row.parent_phone,
    });
    if (canInsertParentRecord) {
      const { data: parentRec, error: parentErr } = await supabase
        .from("parents")
        .insert({
          school_id: spec.id,
          ...(parentsHasUserId ? { user_id: parentUserId } : {}),
          ...(parentsHasEmail ? { email: row.parent_email || parentEmail } : {}),
          full_name: row.parent_name,
          phone: row.parent_phone,
        } as never)
        .select("id")
        .single();
      if (parentErr || !parentRec?.id) throw new Error(`parent insert: ${parentErr?.message}`);
      if (studentParentsTable) {
        const { error: spErr } = await supabase
          .from("student_parents")
          .insert({
            student_id: row.id,
            parent_id: parentRec.id,
            ...(studentParentsHasRelationship ? { relationship: "parent" } : {}),
          } as never);
        if (spErr) throw new Error(`student_parents insert: ${spErr.message}`);
      }
    }
    demoAuths.push({ email: parentEmail, password: DEMO_AUTH_PASSWORD, role: "PARENT", school: spec.name });
  }

  const ctx: SchoolCtx = {
    spec,
    termIds: termIds as [string, string, string],
    subjectIds,
    classRows,
    teacherIds,
    teacherUserIds,
  };

  return { ctx, studentRows: studentMeta, demoAuths };
}

async function seedEvaluationsAndGrades(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: { id: string; class_id: string; school_id: string; perf: Perf; parent_phone: string }[],
  opts: { gradesHasTermId: boolean; evaluationsHasType: boolean },
): Promise<{ evaluations: number; grades: number }> {
  const evalTypes = ["devoir", "interrogation", "composition"] as const;
  const termLabels = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];
  let evalCount = 0;
  let gradeCount = 0;

  const evalBuffer: Record<string, unknown>[] = [];
  const gradeBuffer: { evaluation_id: string; student_id: string; school_id: string; term_id?: string; score: number }[] =
    [];

  for (const cls of ctx.classRows) {
    const classStudents = studentRows.filter((s) => s.class_id === cls.id);
    if (classStudents.length === 0) continue;

    let evalIndex = 0;
    for (let t = 0; t < 3; t += 1) {
      const termId = ctx.termIds[t];
      const picks = faker.helpers.arrayElements([...SUBJECT_NAMES], faker.number.int({ min: 5, max: 8 }));
      for (const subjName of picks) {
        for (let k = 0; k < faker.number.int({ min: 2, max: 4 }); k += 1) {
          const subjectId = ctx.subjectIds[subjName];
          const teacherId = faker.helpers.arrayElement(ctx.teacherIds);
          const eid = crypto.randomUUID();
          evalBuffer.push({
            id: eid,
            school_id: ctx.spec.id,
            class_id: cls.id,
            subject_id: subjectId,
            title: `${subjName} — ${termLabels[t]} — ${evalTypes[evalIndex % 3]}`,
            max_score: 20,
            evaluation_date: faker.date
              .between({
                from: t === 0 ? "2025-09-20" : t === 1 ? "2026-01-10" : "2026-04-05",
                to: t === 0 ? "2025-12-15" : t === 1 ? "2026-03-20" : "2026-06-15",
              })
              .toISOString()
              .slice(0, 10),
            coefficient: faker.helpers.arrayElement([1, 1, 1.5, 2]),
            term_id: termId,
            teacher_id: teacherId,
            ...(opts.evaluationsHasType ? { evaluation_type: evalTypes[evalIndex % 3] } : {}),
          });
          evalIndex += 1;
          evalCount += 1;

          for (const st of classStudents) {
            gradeBuffer.push({
              evaluation_id: eid,
              student_id: st.id,
              school_id: ctx.spec.id,
              ...(opts.gradesHasTermId ? { term_id: termId } : {}),
              score: scoreForPerf(st.perf, evalIndex, t),
            });
          }
        }
      }
    }
  }

  for (const part of chunk(evalBuffer, 300)) {
    const { error } = await supabase.from("evaluations").insert(part as never);
    if (error) throw new Error(`evaluations: ${error.message}`);
  }

  gradeCount = await insertBatched(supabase, "grades", gradeBuffer as never, 500);
  return { evaluations: evalCount, grades: gradeCount };
}

async function seedAttendance(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: { id: string; class_id: string; school_id: string; perf: Perf; parent_phone: string }[],
): Promise<number> {
  const rows: Record<string, unknown>[] = [];
  const dayCount = 72;
  const problematic = new Set(
    faker.helpers.arrayElements(
      studentRows.map((s) => s.id),
      Math.max(8, Math.floor(studentRows.length * 0.04)),
    ),
  );

  for (let d = 0; d < dayCount; d += 1) {
    const date = new Date("2025-09-01T12:00:00Z");
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().slice(0, 10);

    for (const st of studentRows) {
      const isBad = problematic.has(st.id);
      const r = faker.number.int({ min: 0, max: 100 });
      let status: "PRESENT" | "ABSENT" | "LATE";
      if (isBad) {
        if (r < 12) status = "ABSENT";
        else if (r < 45) status = "LATE";
        else status = "PRESENT";
      } else {
        if (r < 3) status = "ABSENT";
        else if (r < 18) status = "LATE";
        else status = "PRESENT";
      }

      rows.push({
        school_id: ctx.spec.id,
        class_id: st.class_id,
        student_id: st.id,
        status,
        date: dateStr,
        justified: status === "ABSENT" && faker.number.int({ min: 0, max: 1 }) === 1,
      });
    }
  }

  return insertBatched(supabase, "attendance", rows, 500);
}

async function seedPayments(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: { id: string; school_id: string; parent_phone: string }[],
): Promise<number> {
  const rows: Record<string, unknown>[] = [];
  const providers = ["Wave", "Orange Money", "MTN Money"] as const;
  for (const st of studentRows) {
    const roll = faker.number.int({ min: 1, max: 100 });
    const status = roll <= 60 ? "paid" : roll <= 90 ? "pending" : "failed";

    rows.push({
      student_id: st.id,
      school_id: ctx.spec.id,
      parent_phone: st.parent_phone,
      amount: 65000,
      type: "inscription",
      provider: faker.helpers.arrayElement(providers),
      status,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    });

    const scolar = faker.number.int({ min: 25000, max: 150000 });
    const roll2 = faker.number.int({ min: 1, max: 100 });
    const status2 = roll2 <= 60 ? "paid" : roll2 <= 90 ? "pending" : "failed";
    rows.push({
      student_id: st.id,
      school_id: ctx.spec.id,
      parent_phone: st.parent_phone,
      amount: scolar,
      type: "scolarite",
      provider: faker.helpers.arrayElement(providers),
      status: status2,
      created_at: faker.date.recent({ days: 120 }).toISOString(),
    });
  }
  return insertBatched(supabase, "student_payments", rows, 400);
}

async function seedWhatsapp(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: { id: string; school_id: string; parent_phone: string }[],
): Promise<number> {
  const templates: { type: string; body: string }[] = [
    {
      type: "grade_notification",
      body: "Bonjour, une nouvelle note est disponible pour votre enfant en Mathématiques. Moyenne actuelle : 12,5/20.",
    },
    {
      type: "absence_alert",
      body: "Votre enfant a été signalé(e) absent(e) aujourd’hui à 8h. Merci de contacter la vie scolaire.",
    },
    {
      type: "payment_reminder",
      body: "Rappel : l’échéance de scolarité du 2e trimestre approche. Paiement possible via Wave ou Orange Money.",
    },
    {
      type: "admin_info",
      body: "Réunion parents-professeurs le samedi 14h en salle polyvalente.",
    },
    {
      type: "ai_summary",
      body: "Résumé IA : progression correcte en Français, vigilance conseillée en Physique-Chimie sur les 3 dernières évaluations.",
    },
  ];
  const rows: Record<string, unknown>[] = [];
  const sample = faker.helpers.arrayElements(studentRows, Math.min(studentRows.length, 180));
  for (const st of sample) {
    const tpl = faker.helpers.arrayElement(templates);
    const status = faker.helpers.arrayElement(["sent", "delivered", "read"] as const);
    rows.push({
      school_id: ctx.spec.id,
      student_id: st.id,
      parent_phone: st.parent_phone,
      message_type: tpl.type,
      body: tpl.body,
      status,
      created_at: faker.date.recent({ days: 60 }).toISOString(),
    });
  }
  return insertBatched(supabase, "whatsapp_messages", rows, 300);
}

async function seedProfilesAndInsights(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: { id: string; school_id: string; perf: Perf }[],
): Promise<{ profiles: number; insights: number }> {
  const profiles: Record<string, unknown>[] = [];
  const insights: Record<string, unknown>[] = [];

  const weakPool = ["Mathématiques", "Physique-Chimie", "Français"];
  const strongPool = ["Anglais", "SVT", "Histoire-Géographie"];
  const focus = ["fractions", "géométrie", "équations", "conjugaison", "rédaction", "probabilités"];

  for (const st of studentRows) {
    const risk =
      st.perf === "weak" || st.perf === "declining" ? "high" : st.perf === "average" ? "medium" : "low";
    profiles.push({
      student_id: st.id,
      school_id: ctx.spec.id,
      weak_subjects: faker.helpers.arrayElements(weakPool, faker.number.int({ min: 0, max: 2 })),
      strong_subjects: faker.helpers.arrayElements(strongPool, faker.number.int({ min: 0, max: 2 })),
      risk_level: risk,
      attendance_risk_score: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      academic_risk_score: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      suggested_focus_areas: faker.helpers.arrayElements(focus, faker.number.int({ min: 1, max: 3 })),
      last_computed_at: new Date().toISOString(),
    });

    if (st.perf === "declining" || st.perf === "weak") {
      insights.push({
        student_id: st.id,
        school_id: ctx.spec.id,
        type: "academic_risk",
        title: "Baisse détectée en Mathématiques",
        description:
          "Les trois dernières notes sont inférieures à la moyenne de classe. Un accompagnement ciblé est recommandé.",
        severity: "high",
        created_at: faker.date.recent({ days: 14 }).toISOString(),
      });
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.12) {
      insights.push({
        student_id: st.id,
        school_id: ctx.spec.id,
        type: "attendance_risk",
        title: "Absences répétées sur les deux dernières semaines",
        description: "Plusieurs absences non justifiées ont été enregistrées. La direction a été informée.",
        severity: "medium",
        created_at: faker.date.recent({ days: 10 }).toISOString(),
      });
    }
    if (st.perf === "improving" && faker.number.float({ min: 0, max: 1 }) < 0.25) {
      insights.push({
        student_id: st.id,
        school_id: ctx.spec.id,
        type: "progress_summary",
        title: "Progression régulière en Français",
        description: "Les résultats s’améliorent nettement depuis le trimestre précédent. Félicitations à l’élève.",
        severity: "low",
        created_at: faker.date.recent({ days: 7 }).toISOString(),
      });
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.08) {
      insights.push({
        student_id: st.id,
        school_id: ctx.spec.id,
        type: "payment_risk",
        title: "Paiement de scolarité en attente",
        description: "Un règlement est signalé comme en attente. Un rappel automatique a été envoyé.",
        severity: "medium",
        created_at: faker.date.recent({ days: 5 }).toISOString(),
      });
    }
  }

  const p = await insertBatched(supabase, "student_learning_profiles", profiles, 400);
  const i = await insertBatched(supabase, "ai_insights", insights, 400);
  return { profiles: p, insights: i };
}

async function main() {
  const reset = process.argv.includes("--reset");
  faker.seed(20260215);

  const supabase = createServiceClient();
  await assertExtensions(supabase);
  const gradesHasTermId = await hasColumn(supabase, "grades", "term_id");
  const evaluationsHasType = await hasColumn(supabase, "evaluations", "evaluation_type");
  if (!gradesHasTermId) {
    console.log("[seed] Warning: grades.term_id absent -> seeding grades without term_id.");
  }
  if (!evaluationsHasType) {
    console.log("[seed] Warning: evaluations.evaluation_type absent -> seeding evaluations without type.");
  }

  const schoolIds = SCHOOL_SPECS.map((s) => s.id);

  if (reset) {
    console.log("[seed] --reset: removing previous seed schools and related data…");
    await deleteSeedSchools(supabase, schoolIds);
  } else {
    const { data: existing } = await supabase.from("schools").select("id").eq("id", schoolIds[0]).maybeSingle();
    if (existing) {
      console.log("[seed] Data already present (use npm run seed:reset to wipe & re-seed). Exiting.");
      process.exit(0);
    }
  }

  console.log("[seed] Creating 5 schools, terms, subjects, classes, teachers (auth), students…");
  const allStudents: { id: string; class_id: string; school_id: string; perf: Perf; parent_phone: string }[] = [];
  const contexts: SchoolCtx[] = [];
  const demoAuths: DemoAuthCredential[] = [];
  let totalTeachers = 0;

  for (const spec of SCHOOL_SPECS) {
    const seeded = await seedSchool(supabase, spec);
    const { ctx, studentRows } = seeded;
    contexts.push(ctx);
    allStudents.push(...studentRows);
    demoAuths.push(...seeded.demoAuths);
    totalTeachers += ctx.teacherIds.length;
    console.log(`  → ${spec.name}: ${studentRows.length} élèves, ${ctx.classRows.length} classes, ${ctx.teacherIds.length} enseignants`);
  }

  console.log("[seed] Evaluations + notes…");
  let totalEval = 0;
  let totalGrades = 0;
  for (let i = 0; i < contexts.length; i += 1) {
    const schoolStudents = allStudents.filter((s) => s.school_id === SCHOOL_SPECS[i].id);
    const r = await seedEvaluationsAndGrades(supabase, contexts[i], schoolStudents, {
      gradesHasTermId,
      evaluationsHasType,
    });
    totalEval += r.evaluations;
    totalGrades += r.grades;
  }
  console.log(`  → ${totalEval} évaluations, ${totalGrades} notes`);

  console.log("[seed] Présences / retards…");
  let att = 0;
  for (let i = 0; i < contexts.length; i += 1) {
    const schoolStudents = allStudents.filter((s) => s.school_id === SCHOOL_SPECS[i].id);
    att += await seedAttendance(supabase, contexts[i], schoolStudents);
  }
  console.log(`  → ${att} lignes de présence`);

  console.log("[seed] Paiements…");
  let pay = 0;
  for (let i = 0; i < contexts.length; i += 1) {
    const schoolStudents = allStudents.filter((s) => s.school_id === SCHOOL_SPECS[i].id);
    pay += await seedPayments(supabase, contexts[i], schoolStudents);
  }
  console.log(`  → ${pay} paiements`);

  console.log("[seed] Messages WhatsApp fictifs…");
  let wa = 0;
  for (let i = 0; i < contexts.length; i += 1) {
    const schoolStudents = allStudents.filter((s) => s.school_id === SCHOOL_SPECS[i].id);
    wa += await seedWhatsapp(supabase, contexts[i], schoolStudents);
  }
  console.log(`  → ${wa} messages`);

  console.log("[seed] Profils apprentissage + insights IA…");
  let prof = 0;
  let ins = 0;
  for (let i = 0; i < contexts.length; i += 1) {
    const schoolStudents = allStudents.filter((s) => s.school_id === SCHOOL_SPECS[i].id);
    const r = await seedProfilesAndInsights(supabase, contexts[i], schoolStudents);
    prof += r.profiles;
    ins += r.insights;
  }
  console.log(`  → ${prof} profils, ${ins} insights`);

  console.log("[seed] Done.");
  console.log(
    JSON.stringify(
      {
        schools: SCHOOL_SPECS.length,
        students: allStudents.length,
        teachers: totalTeachers,
        evaluationsApprox: totalEval,
        grades: totalGrades,
        attendanceRows: att,
        payments: pay,
        whatsapp: wa,
        learningProfiles: prof,
        aiInsights: ins,
      },
      null,
      2,
    ),
  );
  console.log("[seed] Demo auth accounts (same password for all):");
  console.log(`  password: ${DEMO_AUTH_PASSWORD}`);
  for (const acc of demoAuths) {
    console.log(`  - [${acc.role}] ${acc.email} (${acc.school})`);
  }
  const credsPath = writeDemoAuthAccountsFile(demoAuths);
  console.log(`[seed] Auth credentials file written: ${credsPath}`);
}

main().catch((e) => {
  console.error("[seed] Fatal:", e);
  process.exit(1);
});
