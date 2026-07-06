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

const ALL_SEED_SCHOOL_IDS = Object.values(SEED_SCHOOL_IDS);

const SCHOOL_SPECS = [
  {
    id: SEED_SCHOOL_IDS.cma,
    name: "Collège Moderne d’Abidjan",
    city: "Abidjan",
    address: "Rue des écoles, Cocody",
    motto: "L’excellence notre objectif",
    plan: "premium",
    currency: "FCFA",
    // Principal demo school: keep this school because real logo/stamp assets exist.
    principal: true,
    studentTarget: 320,
    richness: 1,
  },
  {
    id: SEED_SCHOOL_IDS.iey,
    name: "Institut Excellence Yamoussoukro",
    city: "Yamoussoukro",
    motto: "Discipline - Travail - Réussite",
    plan: "basic",
    currency: "FCFA",
    principal: false,
    studentTarget: 280,
    richness: 0.75,
  },
  {
    id: SEED_SCHOOL_IDS.gslc,
    name: "Groupe Scolaire La Concorde",
    city: "Bouaké",
    motto: "Éduquer aujourd’hui pour bâtir demain",
    plan: "custom",
    currency: "FCFA",
    principal: false,
    studentTarget: 240,
    richness: 0.4,
  },
  {
    id: SEED_SCHOOL_IDS.csa,
    name: "Collège Saint-Augustin",
    city: "Anyama",
    motto: "Foi - Savoir - Service",
    plan: "basic",
    currency: "FCFA",
    principal: false,
    studentTarget: 200,
    richness: 0.35,
  },
  {
    id: SEED_SCHOOL_IDS.iplp,
    name: "Institut Polyvalent Le Progrès",
    city: "San-Pédro",
    motto: "Travail - Discipline - Réussite",
    plan: "premium",
    currency: "FCFA",
    principal: false,
    studentTarget: 180,
    richness: 0.35,
  },
] as const;

// Demo/staging seed: keep the two requested schools active.
const ACTIVE_SCHOOL_SPECS = SCHOOL_SPECS.slice(0, 2);

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

const STUDENT_PROFILE_PHOTOS = [
  "/student_profil_1.png",
  "/student_profil_2.png",
  "/student_profil_3.png",
  "/student_profil_4.png",
  "/student_profil_5.png",
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

/** Light realism: philosophy only exists in the lycée (1ère / Terminale). */
function subjectAppliesToLevel(subject: string, level: string): boolean {
  if (subject === "Philosophie") return /Terminale|1ère/.test(level);
  return true;
}

function targetStudentsForClass(spec: (typeof SCHOOL_SPECS)[number], level: string, index: number): number {
  const base =
    level.includes("Terminale")
      ? 16
      : level.includes("1Ã¨re")
        ? 18
        : level.includes("2nde")
          ? 20
          : level.includes("3Ã¨me")
            ? 22
            : level.includes("4Ã¨me")
              ? 23
              : level.includes("5Ã¨me")
                ? 24
                : 25;
  const variance = (index * 3 + spec.city.length) % 4;
  const principalBoost = spec.principal ? 2 : 0;
  return base + variance + principalBoost;
}

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

// --- Date helpers anchored on the real "today" (dashboard reads recent windows) ---
const NOW = new Date();
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const TODAY_ISO = isoDay(NOW);

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

/** Random timestamp within the last `n` days (returns ISO string). */
function recentTimestamp(maxDaysAgo: number): string {
  const ms = NOW.getTime() - faker.number.int({ min: 0, max: maxDaysAgo * 86_400_000 });
  return new Date(ms).toISOString();
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type TrendLabel = "IMPROVING" | "STABLE" | "DECLINING";

type MetricOverride = {
  average: number;
  attendance: number;
  trend: TrendLabel;
  risk: RiskLevel;
  alert: boolean;
};

/**
 * Named at-risk students for the principal school, so the demo can tell a story
 * ("on clique sur Habib Koné…"). Keyed later by the generated student id.
 */
const PRINCIPAL_AT_RISK: { firstName: string; lastName: string; perf: Perf; metric: MetricOverride }[] = [
  { firstName: "Habib", lastName: "Koné", perf: "weak", metric: { average: 7.2, attendance: 88, trend: "DECLINING", risk: "HIGH", alert: true } },
  { firstName: "Binta", lastName: "N’Guessan", perf: "weak", metric: { average: 9.1, attendance: 72, trend: "DECLINING", risk: "HIGH", alert: true } },
  { firstName: "Ibrahim", lastName: "Bamba", perf: "weak", metric: { average: 7.4, attendance: 79, trend: "DECLINING", risk: "HIGH", alert: true } },
  { firstName: "Oumar", lastName: "Sangaré", perf: "declining", metric: { average: 7.8, attendance: 83, trend: "DECLINING", risk: "HIGH", alert: true } },
  { firstName: "Akissi", lastName: "Fofana", perf: "declining", metric: { average: 9.8, attendance: 81, trend: "DECLINING", risk: "MEDIUM", alert: true } },
  { firstName: "Mamadou", lastName: "Amani", perf: "declining", metric: { average: 10.1, attendance: 86, trend: "DECLINING", risk: "MEDIUM", alert: true } },
  { firstName: "Salimata", lastName: "Touré", perf: "average", metric: { average: 10.4, attendance: 84, trend: "STABLE", risk: "MEDIUM", alert: true } },
  { firstName: "Adjoua", lastName: "Kouamé", perf: "average", metric: { average: 9.5, attendance: 88, trend: "DECLINING", risk: "MEDIUM", alert: false } },
];

/** student_id -> forced academic_metrics values (only for the named demo students). */
const metricOverrides = new Map<string, MetricOverride>();

type NotifType = "GRADE_PUBLISHED" | "ABSENCE_ALERT" | "REPORT_AVAILABLE" | "PAYMENT_REMINDER" | "ADMIN_INFO";

function notifMessage(type: NotifType, childName: string): string {
  const first = childName.split(/\s+/)[0] || "votre enfant";
  switch (type) {
    case "GRADE_PUBLISHED": {
      const subject = faker.helpers.arrayElement(["Mathématiques", "Français", "Anglais", "Physique-Chimie", "SVT"]);
      const score = faker.number.int({ min: 8, max: 18 });
      return `Bonjour, ${first} a obtenu ${score}/20 en ${subject}. Consultez le détail dans l’espace parent.`;
    }
    case "ABSENCE_ALERT":
      return `Votre enfant ${first} a été marqué(e) absent(e) aujourd’hui. Merci de contacter la vie scolaire.`;
    case "REPORT_AVAILABLE":
      return `Le bulletin du Trimestre 3 de ${first} est disponible dans votre espace parent.`;
    case "PAYMENT_REMINDER":
      return `Rappel : la scolarité du Trimestre 3 arrive à échéance. Paiement possible via Wave ou Orange Money.`;
    case "ADMIN_INFO":
      return faker.helpers.arrayElement([
        "Réunion parents-professeurs samedi à 10h en salle polyvalente.",
        "Les cours reprennent lundi après le congé. Bonne reprise à tous.",
        "Pensez à mettre à jour le dossier médical de votre enfant.",
      ]);
    default:
      return "Information de l’établissement.";
  }
}

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
  adminUserId: string;
  /** `${classId}:${subjectId}` -> teacherId, so evaluations match the class teacher. */
  assignments: Map<string, string>;
};

/** Shared shape for an in-memory student used across all seeding steps. */
type StudentMeta = {
  id: string;
  class_id: string;
  school_id: string;
  perf: Perf;
  parent_phone: string;
  fullName: string;
};

type DemoAuthCredential = {
  email: string;
  password: string;
  role: "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
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
  if (r < 6) return "excellent";
  if (r < 16) return "weak";
  if (r < 25) return "declining";
  if (r < 36) return "improving";
  return "average";
}

function scoreForPerf(perf: Perf, evalIndex: number, termIndex: number): number {
  const base =
    perf === "excellent"
      ? 15.2 + faker.number.float({ min: 0, max: 2.7, fractionDigits: 1 })
      : perf === "weak"
        ? 6.2 + faker.number.float({ min: 0, max: 3.2, fractionDigits: 1 })
        : perf === "declining"
          ? Math.max(7, 13.5 - evalIndex * 0.18 - termIndex * 0.55 + faker.number.float({ min: -1.1, max: 1.1, fractionDigits: 1 }))
          : perf === "improving"
            ? Math.min(16.5, 9.5 + evalIndex * 0.15 + termIndex * 0.65 + faker.number.float({ min: -0.9, max: 1.2, fractionDigits: 1 }))
            : 9.2 + faker.number.float({ min: 0, max: 5.7, fractionDigits: 1 });
  return Math.round(Math.min(18.2, Math.max(6, base)) * 10) / 10;
}

async function seedSchool(supabase: SupabaseClient, spec: (typeof SCHOOL_SPECS)[number]): Promise<{
  ctx: SchoolCtx;
  studentRows: StudentMeta[];
  demoAuths: DemoAuthCredential[];
}> {
  const logoUrl = `https://placehold.co/320x120/png?text=${encodeURIComponent(spec.name.slice(0, 18))}`;

  const { error: sErr } = await supabase.from("schools").insert({
    id: spec.id,
    name: spec.name,
    country: "Côte d’Ivoire",
    city: spec.city,
    address: "address" in spec ? spec.address : null,
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

  // Current term for the demo is Trimestre 3 (index 2). Column may not exist on partial schemas.
  {
    const { error: setTermErr } = await supabase
      .from("schools")
      .update({ current_term_id: termIds[2] })
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

  const classCount = Math.min(14, CLASS_BLUEPRINTS.length);
  const blueprints = CLASS_BLUEPRINTS.slice(0, classCount);
  const classIns = blueprints.map((bp, index) => ({
    school_id: spec.id,
    name: bp.name,
    level: bp.level,
    academic_year: ACADEMIC_YEAR,
    capacity: targetStudentsForClass(spec, bp.level, index) + 4,
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
  const teacherSubjectPairs: { teacherId: string; subject: string }[] = [];
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
  const adminUserId = await createAuthUser(supabase, {
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
    // First teacher of each school gets a predictable, demoable login.
    const email =
      i === 0
        ? `teacher.${schoolSlug}@seed-elima.invalid`
        : `seed.t.${spec.id.slice(0, 8)}.${i}.${faker.string.alphanumeric(8)}@seed-elima.invalid`;
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
    if (i === 0) {
      demoAuths.push({ email, password: DEMO_AUTH_PASSWORD, role: "TEACHER", school: spec.name });
    }

    const tid = await waitForTeacherRow(supabase, userId);
    teacherIds.push(tid);
    teacherSubjectPairs.push({ teacherId: tid, subject: primarySubject });

    const { error: upTErr } = await supabase.from("teachers").update({ primary_subject: primarySubject }).eq("id", tid);
    if (upTErr) throw new Error(`teacher primary_subject: ${upTErr.message}`);
  }

  // Teaching assignments: every class gets a teacher per (level-applicable) subject.
  // Prefer teachers whose primary subject matches; round-robin spreads the load.
  const teachersBySubject = new Map<string, string[]>();
  for (const pair of teacherSubjectPairs) {
    const arr = teachersBySubject.get(pair.subject) ?? [];
    arr.push(pair.teacherId);
    teachersBySubject.set(pair.subject, arr);
  }
  const assignments = new Map<string, string>();
  const classTeacherRows: Record<string, unknown>[] = [];
  const teacherSubjectClassRows: Record<string, unknown>[] = [];
  const rrIndex = new Map<string, number>();
  for (const cls of classRows) {
    for (const subjName of SUBJECT_NAMES) {
      if (!subjectAppliesToLevel(subjName, cls.level)) continue;
      const subjectId = subjectIds[subjName];
      const pool = teachersBySubject.get(subjName)?.length ? teachersBySubject.get(subjName)! : teacherIds;
      const idx = (rrIndex.get(subjName) ?? 0) % pool.length;
      rrIndex.set(subjName, idx + 1);
      const teacherId = pool[idx];
      assignments.set(`${cls.id}:${subjectId}`, teacherId);
      classTeacherRows.push({ class_id: cls.id, teacher_id: teacherId, subject_id: subjectId });
      teacherSubjectClassRows.push({ teacher_id: teacherId, class_id: cls.id, subject_id: subjectId });
    }
  }

  // Make the predictable demo teacher immediately useful in the teacher portal:
  // several classes and subjects are available in the dropdowns, with real grades
  // generated below because the assignment map points these pairs to this teacher.
  const demoTeacherId = teacherIds[0];
  const demoSubjects = ["MathÃ©matiques", "FranÃ§ais", "Anglais"];
  for (const cls of classRows.slice(0, 5)) {
    for (const subjName of demoSubjects) {
      if (!subjectAppliesToLevel(subjName, cls.level)) continue;
      const subjectId = subjectIds[subjName];
      if (!subjectId) continue;
      const alreadyAssigned = classTeacherRows.some(
        (row) => row.class_id === cls.id && row.teacher_id === demoTeacherId && row.subject_id === subjectId,
      );
      if (alreadyAssigned) {
        assignments.set(`${cls.id}:${subjectId}`, demoTeacherId);
        continue;
      }
      assignments.set(`${cls.id}:${subjectId}`, demoTeacherId);
      classTeacherRows.push({ class_id: cls.id, teacher_id: demoTeacherId, subject_id: subjectId });
      teacherSubjectClassRows.push({ teacher_id: demoTeacherId, class_id: cls.id, subject_id: subjectId });
    }
  }

  await insertBatched(supabase, "class_teachers", classTeacherRows, 400);
  await insertBatched(supabase, "teacher_subject_classes", teacherSubjectClassRows, 400);

  const classSlots = new Map(classRows.map((cls, index) => [cls.id, targetStudentsForClass(spec, cls.level, index)]));
  const studentsHasPhotoUrl = await hasColumn(supabase, "students", "photo_url");

  const studentBulk: Record<string, unknown>[] = [];
  const studentMeta: StudentMeta[] = [];

  const pickClassWithSlot = () => {
    const available = classRows.filter((cls) => (classSlots.get(cls.id) ?? 0) > 0);
    const pool = available.length ? available : classRows;
    const weights = pool.map((c) => (LEVEL_WEIGHTS[c.level] ?? 5) * Math.max(1, classSlots.get(c.id) ?? 1));
    const wSum = weights.reduce((a, b) => a + b, 0);
    let r = faker.number.float({ min: 0, max: wSum });
    for (let j = 0; j < pool.length; j += 1) {
      r -= weights[j];
      if (r <= 0) return pool[j];
    }
    return pool[pool.length - 1];
  };

  const pushStudent = (fn: string, ln: string, perf: Perf, cls: (typeof classRows)[number]): string => {
    const fullName = `${fn} ${ln}`;
    const gender = faker.helpers.arrayElement(["M", "F"] as const);
    const birth = faker.date.birthdate({ min: 11, max: 19, mode: "age" }).toISOString().slice(0, 10);
    const parentPhone = ivorianMobile();
    const sid = crypto.randomUUID();

    studentBulk.push({
      id: sid,
      school_id: spec.id,
      class_id: cls.id,
      full_name: fullName,
      ...(studentsHasPhotoUrl ? { photo_url: STUDENT_PROFILE_PHOTOS[studentMeta.length % STUDENT_PROFILE_PHOTOS.length] } : {}),
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
    classSlots.set(cls.id, Math.max(0, (classSlots.get(cls.id) ?? 0) - 1));
    studentMeta.push({ id: sid, class_id: cls.id, school_id: spec.id, perf, parent_phone: parentPhone, fullName });
    return sid;
  };

  // Named, story-driven at-risk students (principal school only) created first so they
  // surface at the top of the dashboard "Élèves à risque" list.
  if (spec.principal) {
    for (const named of PRINCIPAL_AT_RISK) {
      const cls = pickClassWithSlot();
      const sid = pushStudent(named.firstName, named.lastName, named.perf, cls);
      metricOverrides.set(sid, named.metric);
    }
  }

  while (Array.from(classSlots.values()).some((slots) => slots > 0)) {
    const cls = pickClassWithSlot();
    const fn = faker.helpers.arrayElement(FIRST_NAMES);
    const ln = faker.helpers.arrayElement(LAST_NAMES);
    const perf = pickPerf(faker.number.int({ min: 0, max: 1_000_000 }));
    pushStudent(fn, ln, perf, cls);
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
    adminUserId,
    assignments,
  };

  return { ctx, studentRows: studentMeta, demoAuths };
}

async function seedEvaluationsAndGrades(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: StudentMeta[],
  opts: { gradesHasTermId: boolean; evaluationsHasType: boolean },
): Promise<{ evaluations: number; grades: number; studentAverages: Map<string, number> }> {
  const evalTypes = ["devoir", "interrogation", "composition"] as const;
  const termLabels = ["Trimestre 1", "Trimestre 2", "Trimestre 3"];
  const richness = ctx.spec.richness;
  let evalCount = 0;
  let gradeCount = 0;

  const evalBuffer: Record<string, unknown>[] = [];
  const gradeBuffer: { evaluation_id: string; student_id: string; school_id: string; term_id?: string; score: number }[] =
    [];
  // Running average per student (used later for academic_metrics & reports).
  const sums = new Map<string, { sum: number; n: number }>();

  // For Trimestre 3 (current term), let some evaluations land within the last few days
  // so the dashboard shows recent activity and "classes sans notes récentes" stays realistic.
  const termRanges: [string, string][] = [
    ["2025-09-20", "2025-12-15"],
    ["2026-01-10", "2026-03-20"],
    ["2026-04-05", TODAY_ISO],
  ];
  const previousYearTermRanges: [string, string][] = [
    ["2024-09-20", "2024-12-15"],
    ["2025-01-10", "2025-03-20"],
    ["2025-04-05", "2025-06-20"],
  ];

  for (const cls of ctx.classRows) {
    const classStudents = studentRows.filter((s) => s.class_id === cls.id);
    if (classStudents.length === 0) continue;

    let evalIndex = 0;
    const subjectPool = SUBJECT_NAMES.filter((s) => subjectAppliesToLevel(s, cls.level));

    for (let t = 0; t < 3; t += 1) {
      const previousPicks = faker.helpers.arrayElements(subjectPool, Math.min(subjectPool.length, Math.max(3, Math.round(4 * richness))));
      for (const subjName of previousPicks) {
        const evalsPerSubject = Math.max(1, faker.number.int({ min: 1, max: Math.max(1, Math.round(2 * richness)) }));
        for (let k = 0; k < evalsPerSubject; k += 1) {
          const subjectId = ctx.subjectIds[subjName];
          const teacherId = ctx.assignments.get(`${cls.id}:${subjectId}`) ?? faker.helpers.arrayElement(ctx.teacherIds);
          const eid = crypto.randomUUID();
          evalBuffer.push({
            id: eid,
            school_id: ctx.spec.id,
            class_id: cls.id,
            subject_id: subjectId,
            title: `${subjName} — Année précédente — ${termLabels[t]} — ${evalTypes[evalIndex % 3]}`,
            max_score: 20,
            evaluation_date: faker.date
              .between({ from: previousYearTermRanges[t][0], to: previousYearTermRanges[t][1] })
              .toISOString()
              .slice(0, 10),
            coefficient: faker.helpers.arrayElement([1, 1, 1.5, 2]),
            teacher_id: teacherId,
            ...(opts.evaluationsHasType ? { evaluation_type: evalTypes[evalIndex % 3] } : {}),
          });
          evalIndex += 1;
          evalCount += 1;

          for (const st of classStudents) {
            const previousScore = Math.round(Math.min(18.2, Math.max(6, scoreForPerf(st.perf, evalIndex, t) + faker.number.float({ min: -0.8, max: 0.6, fractionDigits: 1 }))) * 10) / 10;
            gradeBuffer.push({
              evaluation_id: eid,
              student_id: st.id,
              school_id: ctx.spec.id,
              score: previousScore,
            });
          }
        }
      }
    }

    for (let t = 0; t < 3; t += 1) {
      const termId = ctx.termIds[t];
      const subjMin = Math.max(3, Math.round(5 * richness));
      const subjMax = Math.max(subjMin + 1, Math.round(8 * richness));
      const picks = faker.helpers.arrayElements(subjectPool, Math.min(subjectPool.length, faker.number.int({ min: subjMin, max: subjMax })));
      for (const subjName of picks) {
        const evalsPerSubject = Math.max(1, faker.number.int({ min: Math.round(2 * richness), max: Math.max(2, Math.round(4 * richness)) }));
        for (let k = 0; k < evalsPerSubject; k += 1) {
          const subjectId = ctx.subjectIds[subjName];
          const teacherId = ctx.assignments.get(`${cls.id}:${subjectId}`) ?? faker.helpers.arrayElement(ctx.teacherIds);
          const eid = crypto.randomUUID();
          evalBuffer.push({
            id: eid,
            school_id: ctx.spec.id,
            class_id: cls.id,
            subject_id: subjectId,
            title: `${subjName} — ${termLabels[t]} — ${evalTypes[evalIndex % 3]}`,
            max_score: 20,
            evaluation_date: faker.date
              .between({ from: termRanges[t][0], to: termRanges[t][1] })
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
            const score = scoreForPerf(st.perf, evalIndex, t);
            gradeBuffer.push({
              evaluation_id: eid,
              student_id: st.id,
              school_id: ctx.spec.id,
              ...(opts.gradesHasTermId ? { term_id: termId } : {}),
              score,
            });
            const cur = sums.get(st.id) ?? { sum: 0, n: 0 };
            cur.sum += score;
            cur.n += 1;
            sums.set(st.id, cur);
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

  const studentAverages = new Map<string, number>();
  for (const [sid, v] of sums) {
    studentAverages.set(sid, Math.round((v.sum / Math.max(1, v.n)) * 10) / 10);
  }
  return { evaluations: evalCount, grades: gradeCount, studentAverages };
}

async function seedAttendance(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: StudentMeta[],
): Promise<{
  inserted: number;
  ratesByStudent: Map<string, number>;
  today: { present: number; absent: number; late: number };
  todayAbsentStudentIds: string[];
}> {
  const rows: Record<string, unknown>[] = [];
  // Last 45 calendar days, ending today (weekends skipped, today always included).
  const dayCount = 45;
  const problematic = new Set(
    faker.helpers.arrayElements(
      studentRows.map((s) => s.id),
      Math.max(10, Math.floor(studentRows.length * 0.08)),
    ),
  );

  const counts = new Map<string, { present: number; total: number }>();
  const today = { present: 0, absent: 0, late: 0 };
  const todayAbsentStudentIds: string[] = [];

  // Per-student attendance profile so presence rates spread realistically
  // (otherwise everyone shares the same probability and clusters around ~90%).
  const profile = new Map<string, { pAbsent: number; pLate: number }>();
  for (const st of studentRows) {
    if (problematic.has(st.id)) {
      profile.set(st.id, {
        pAbsent: faker.number.float({ min: 12, max: 22 }),
        pLate: faker.number.float({ min: 8, max: 16 }),
      });
    } else if (faker.number.float({ min: 0, max: 100 }) < 12) {
      // ~55% of regular students are perfectly assiduous → 100% presence.
      profile.set(st.id, { pAbsent: 0, pLate: 0 });
    } else {
      profile.set(st.id, {
        pAbsent: faker.number.float({ min: 2, max: 8 }),
        pLate: faker.number.float({ min: 2, max: 11 }),
      });
    }
  }

  for (let d = dayCount - 1; d >= 0; d -= 1) {
    const date = daysAgo(d);
    const isToday = d === 0;
    if (!isToday && (date.getDay() === 0 || date.getDay() === 6)) continue;
    const dateStr = isoDay(date);

    for (const st of studentRows) {
      const p = profile.get(st.id) ?? { pAbsent: 4, pLate: 8 };
      const r = faker.number.float({ min: 0, max: 100 });
      let status: "PRESENT" | "ABSENT" | "LATE";
      if (r < p.pAbsent) status = "ABSENT";
      else if (r < p.pAbsent + p.pLate) status = "LATE";
      else status = "PRESENT";

      const cur = counts.get(st.id) ?? { present: 0, total: 0 };
      cur.total += 1;
      if (status === "PRESENT") cur.present += 1;
      counts.set(st.id, cur);

      if (isToday) {
        if (status === "PRESENT") today.present += 1;
        else if (status === "ABSENT") {
          today.absent += 1;
          todayAbsentStudentIds.push(st.id);
        } else today.late += 1;
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

  const inserted = await insertBatched(supabase, "attendance", rows, 500);
  const ratesByStudent = new Map<string, number>();
  for (const [sid, v] of counts) {
    ratesByStudent.set(sid, v.total ? Math.round((v.present / v.total) * 1000) / 10 : 100);
  }
  return { inserted, ratesByStudent, today, todayAbsentStudentIds };
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
      amount: 25000,
      type: "inscription",
      provider: faker.helpers.arrayElement(providers),
      status,
      created_at: faker.date.past({ years: 1 }).toISOString(),
    });

    const scolar = faker.number.int({ min: 35000, max: 55000 });
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

function todayTimestamp(): string {
  const start = new Date(NOW);
  start.setHours(0, 0, 0, 0);
  const span = Math.max(1, NOW.getTime() - start.getTime());
  return new Date(start.getTime() + faker.number.int({ min: 0, max: span })).toISOString();
}

function perfFallbackAverage(perf: Perf): number {
  switch (perf) {
    case "excellent":
      return 16.5;
    case "weak":
      return 7.5;
    case "declining":
      return 9.5;
    case "improving":
      return 12.5;
    default:
      return 12;
  }
}

function perfTrend(perf: Perf): TrendLabel {
  if (perf === "improving") return "IMPROVING";
  if (perf === "declining") return "DECLINING";
  if (perf === "weak") return faker.datatype.boolean() ? "DECLINING" : "STABLE";
  return "STABLE";
}

function computeRisk(avg: number, attendance: number): RiskLevel {
  if (avg < 8 || attendance < 75) return "HIGH";
  if (avg < 11 || attendance < 85) return "MEDIUM";
  return "LOW";
}

async function seedAcademicMetrics(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: StudentMeta[],
  averages: Map<string, number>,
  attRates: Map<string, number>,
): Promise<{ count: number; dist: Record<RiskLevel, number> }> {
  const rows: Record<string, unknown>[] = [];
  const dist: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  for (const st of studentRows) {
    const override = metricOverrides.get(st.id);
    let average: number;
    let attendance: number;
    let trend: TrendLabel;
    let risk: RiskLevel;
    let alert: boolean;

    if (override) {
      average = override.average;
      attendance = override.attendance;
      trend = override.trend;
      risk = override.risk;
      alert = override.alert;
    } else {
      average = averages.get(st.id) ?? perfFallbackAverage(st.perf);
      attendance = attRates.get(st.id) ?? 95;
      trend = perfTrend(st.perf);
      risk = computeRisk(average, attendance);
      alert = risk === "HIGH" || (risk === "MEDIUM" && faker.number.float({ min: 0, max: 1 }) < 0.4);
    }

    dist[risk] += 1;
    rows.push({
      school_id: ctx.spec.id,
      student_id: st.id,
      average_score: average,
      attendance_rate: attendance,
      performance_trend: trend,
      risk_level: risk,
      alert_flag: alert,
      computed_at: recentTimestamp(3),
    });
  }

  const count = await insertBatched(supabase, "academic_metrics", rows, 500);
  return { count, dist };
}

async function seedReports(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: StudentMeta[],
  averages: Map<string, number>,
  attRates: Map<string, number>,
): Promise<number> {
  const target = ctx.spec.principal ? 120 : faker.number.int({ min: 20, max: 40 });
  const sample = faker.helpers.arrayElements(studentRows, Math.min(target, studentRows.length));
  const rows = sample.map((st, i) => ({
    school_id: ctx.spec.id,
    student_id: st.id,
    term: "Trimestre 3",
    average_score: averages.get(st.id) ?? perfFallbackAverage(st.perf),
    attendance_rate: attRates.get(st.id) ?? 95,
    pdf_url: `https://demo.elima.africa/reports/${st.id}.pdf`,
    published_by: ctx.adminUserId,
    created_at: i < 5 ? todayTimestamp() : recentTimestamp(12),
  }));
  return insertBatched(supabase, "reports", rows as never, 300);
}

async function seedNotifications(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
  studentRows: StudentMeta[],
  todayAbsentStudentIds: string[],
): Promise<{ sent: number; pending: number; failed: number }> {
  const principal = ctx.spec.principal;
  const sentTarget = principal ? faker.number.int({ min: 320, max: 470 }) : faker.number.int({ min: 40, max: 90 });
  const pendingTarget = principal ? faker.number.int({ min: 25, max: 55 }) : faker.number.int({ min: 6, max: 18 });
  const failedTarget = principal ? faker.number.int({ min: 8, max: 18 }) : faker.number.int({ min: 2, max: 6 });

  const nameById = new Map(studentRows.map((s) => [s.id, s.fullName]));
  const types: NotifType[] = ["GRADE_PUBLISHED", "ABSENCE_ALERT", "REPORT_AVAILABLE", "PAYMENT_REMINDER", "ADMIN_INFO"];
  const rows: Record<string, unknown>[] = [];

  const buildRow = (
    status: "SENT" | "PENDING" | "FAILED",
    type: NotifType,
    studentId: string,
    createdAt: string,
  ) => {
    const childName = nameById.get(studentId) ?? "votre enfant";
    rows.push({
      school_id: ctx.spec.id,
      student_id: studentId,
      parent_id: null,
      type,
      channel: "WHATSAPP",
      message: notifMessage(type, childName),
      status,
      provider_ref: status === "SENT" ? `wamid.${faker.string.alphanumeric(20)}` : null,
      sent_at: status === "SENT" ? createdAt : null,
      created_at: createdAt,
    });
  };

  // Coherent absence alerts for students actually absent today (scenario 3).
  const absenceSample = faker.helpers.arrayElements(
    todayAbsentStudentIds,
    Math.min(todayAbsentStudentIds.length, principal ? 25 : 8),
  );
  let sentMade = 0;
  for (const sid of absenceSample) {
    buildRow("SENT", "ABSENCE_ALERT", sid, todayTimestamp());
    sentMade += 1;
  }

  // Remaining SENT: ~60% created today (feeds "WhatsApp cette semaine"), rest over 7 days.
  for (; sentMade < sentTarget; sentMade += 1) {
    const st = faker.helpers.arrayElement(studentRows);
    const type = faker.helpers.arrayElement(types);
    const createdAt = faker.number.float({ min: 0, max: 1 }) < 0.6 ? todayTimestamp() : recentTimestamp(7);
    buildRow("SENT", type, st.id, createdAt);
  }

  for (let i = 0; i < pendingTarget; i += 1) {
    const st = faker.helpers.arrayElement(studentRows);
    const type = faker.helpers.arrayElement(types);
    buildRow("PENDING", type, st.id, faker.number.float({ min: 0, max: 1 }) < 0.5 ? todayTimestamp() : recentTimestamp(3));
  }

  for (let i = 0; i < failedTarget; i += 1) {
    const st = faker.helpers.arrayElement(studentRows);
    const type = faker.helpers.arrayElement(types);
    buildRow("FAILED", type, st.id, recentTimestamp(6));
  }

  await insertBatched(supabase, "notifications", rows, 500);
  return { sent: sentMade, pending: pendingTarget, failed: failedTarget };
}

async function seedConversationsAndMessages(
  supabase: SupabaseClient,
  ctx: SchoolCtx,
): Promise<{ conversations: number; messages: number }> {
  const findClass = (needle: string) =>
    ctx.classRows.find((c) => c.name.toLowerCase().includes(needle.toLowerCase())) ??
    faker.helpers.arrayElement(ctx.classRows);

  const blueprints = ctx.spec.principal
    ? [
        { title: "Direction → Parents 3ème A", cls: findClass("3ème A") },
        { title: "Administration → Parents Terminale D", cls: findClass("Terminale D") },
        { title: "Vie scolaire → Parents 6ème B", cls: findClass("6ème B") },
      ]
    : [{ title: "Administration → Parents", cls: faker.helpers.arrayElement(ctx.classRows) }];

  const bodies = [
    "Bonjour à tous, merci de noter la réunion parents-professeurs de ce samedi.",
    "Les bulletins du Trimestre 3 seront disponibles cette semaine dans votre espace.",
    "Pensez à régulariser les absences non justifiées auprès de la vie scolaire.",
    "Félicitations aux élèves pour leurs résultats en nette progression ce trimestre.",
  ];

  let convCount = 0;
  let msgCount = 0;

  for (const bp of blueprints) {
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({ school_id: ctx.spec.id, title: bp.title, created_at: recentTimestamp(5) } as never)
      .select("id")
      .single();
    if (convErr || !conv) throw new Error(`conversation: ${convErr?.message}`);
    convCount += 1;

    const participants = [
      { conversation_id: conv.id, participant_type: "USER", user_id: ctx.adminUserId, class_id: null },
      { conversation_id: conv.id, participant_type: "CLASS", user_id: null, class_id: bp.cls.id },
    ];
    const { error: partErr } = await supabase.from("conversation_participants").insert(participants as never);
    if (partErr) throw new Error(`conversation_participants: ${partErr.message}`);

    const messageCountForConv = faker.number.int({ min: 2, max: 4 });
    const msgRows = Array.from({ length: messageCountForConv }).map((_, i) => ({
      conversation_id: conv.id,
      sender_id: ctx.adminUserId,
      content: faker.helpers.arrayElement(bodies),
      created_at: i === messageCountForConv - 1 ? todayTimestamp() : recentTimestamp(4),
    }));
    msgCount += await insertBatched(supabase, "messages", msgRows as never, 100);
  }

  return { conversations: convCount, messages: msgCount };
}

async function seedAuditLogs(supabase: SupabaseClient, ctx: SchoolCtx): Promise<number> {
  const entries: { action: string; entity_type: string; daysAgo: number }[] = ctx.spec.principal
    ? [
        { action: "evaluation.created", entity_type: "evaluation", daysAgo: 0 },
        { action: "grade.entered", entity_type: "grade", daysAgo: 0 },
        { action: "notification.sent", entity_type: "notification", daysAgo: 0 },
        { action: "report.published", entity_type: "report", daysAgo: 1 },
        { action: "call.logged", entity_type: "parent", daysAgo: 1 },
        { action: "class.updated", entity_type: "class", daysAgo: 2 },
        { action: "attendance.recorded", entity_type: "attendance", daysAgo: 0 },
        { action: "report.published", entity_type: "report", daysAgo: 3 },
      ]
    : [
        { action: "evaluation.created", entity_type: "evaluation", daysAgo: 1 },
        { action: "grade.entered", entity_type: "grade", daysAgo: 2 },
        { action: "notification.sent", entity_type: "notification", daysAgo: 3 },
      ];

  const rows = entries.map((e) => ({
    school_id: ctx.spec.id,
    user_id: ctx.adminUserId,
    action: e.action,
    entity_type: e.entity_type,
    entity_id: null,
    created_at: e.daysAgo === 0 ? todayTimestamp() : recentTimestamp(e.daysAgo),
  }));
  return insertBatched(supabase, "audit_logs", rows as never, 100);
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

  const schoolIds = ALL_SEED_SCHOOL_IDS;

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

  console.log("[seed] Creating 2 schools, terms, subjects, classes, teachers (auth), students...");
  const allStudents: StudentMeta[] = [];
  const contexts: SchoolCtx[] = [];
  const demoAuths: DemoAuthCredential[] = [];
  const studentsBySchool = new Map<string, StudentMeta[]>();
  let totalTeachers = 0;

  for (const spec of ACTIVE_SCHOOL_SPECS) {
    const seeded = await seedSchool(supabase, spec);
    const { ctx, studentRows } = seeded;
    contexts.push(ctx);
    allStudents.push(...studentRows);
    studentsBySchool.set(spec.id, studentRows);
    demoAuths.push(...seeded.demoAuths);
    totalTeachers += ctx.teacherIds.length;
    console.log(`  → ${spec.name}: ${studentRows.length} élèves, ${ctx.classRows.length} classes, ${ctx.teacherIds.length} enseignants`);
  }

  // Per-school working maps reused by metrics / reports.
  const averagesBySchool = new Map<string, Map<string, number>>();
  const attRatesBySchool = new Map<string, Map<string, number>>();
  const todayAbsentBySchool = new Map<string, string[]>();

  console.log("[seed] Évaluations + notes…");
  let totalEval = 0;
  let totalGrades = 0;
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    const r = await seedEvaluationsAndGrades(supabase, ctx, schoolStudents, { gradesHasTermId, evaluationsHasType });
    averagesBySchool.set(ctx.spec.id, r.studentAverages);
    totalEval += r.evaluations;
    totalGrades += r.grades;
  }
  console.log(`  → ${totalEval} évaluations, ${totalGrades} notes`);

  console.log("[seed] Présences / retards (30 derniers jours, aujourd’hui inclus)…");
  let att = 0;
  const todayTotals = { present: 0, absent: 0, late: 0 };
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    const r = await seedAttendance(supabase, ctx, schoolStudents);
    att += r.inserted;
    attRatesBySchool.set(ctx.spec.id, r.ratesByStudent);
    todayAbsentBySchool.set(ctx.spec.id, r.todayAbsentStudentIds);
    if (ctx.spec.principal) {
      todayTotals.present = r.today.present;
      todayTotals.absent = r.today.absent;
      todayTotals.late = r.today.late;
    }
  }
  console.log(
    `  → ${att} lignes de présence | aujourd’hui (école principale): ${todayTotals.present} présents, ${todayTotals.absent} absents, ${todayTotals.late} retards`,
  );

  console.log("[seed] Academic metrics (LOW/MEDIUM/HIGH)…");
  let metricsCount = 0;
  const riskTotals: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    const r = await seedAcademicMetrics(
      supabase,
      ctx,
      schoolStudents,
      averagesBySchool.get(ctx.spec.id) ?? new Map(),
      attRatesBySchool.get(ctx.spec.id) ?? new Map(),
    );
    metricsCount += r.count;
    riskTotals.LOW += r.dist.LOW;
    riskTotals.MEDIUM += r.dist.MEDIUM;
    riskTotals.HIGH += r.dist.HIGH;
  }
  console.log(`  → ${metricsCount} academic_metrics (LOW ${riskTotals.LOW} / MEDIUM ${riskTotals.MEDIUM} / HIGH ${riskTotals.HIGH})`);

  console.log("[seed] Bulletins (reports) Trimestre 3…");
  let reportsCount = 0;
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    reportsCount += await seedReports(
      supabase,
      ctx,
      schoolStudents,
      averagesBySchool.get(ctx.spec.id) ?? new Map(),
      attRatesBySchool.get(ctx.spec.id) ?? new Map(),
    );
  }
  console.log(`  → ${reportsCount} bulletins publiés (le reste génère l’alerte « Bulletins non publiés »)`);

  console.log("[seed] Notifications WhatsApp…");
  const notifTotals = { sent: 0, pending: 0, failed: 0 };
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    const r = await seedNotifications(supabase, ctx, schoolStudents, todayAbsentBySchool.get(ctx.spec.id) ?? []);
    notifTotals.sent += r.sent;
    notifTotals.pending += r.pending;
    notifTotals.failed += r.failed;
  }
  console.log(`  → notifications: ${notifTotals.sent} SENT / ${notifTotals.pending} PENDING / ${notifTotals.failed} FAILED`);

  console.log("[seed] Conversations + messages…");
  let convTotal = 0;
  let msgTotal = 0;
  for (const ctx of contexts) {
    const r = await seedConversationsAndMessages(supabase, ctx);
    convTotal += r.conversations;
    msgTotal += r.messages;
  }
  console.log(`  → ${convTotal} conversations, ${msgTotal} messages`);

  console.log("[seed] Audit logs (activité récente)…");
  let auditTotal = 0;
  for (const ctx of contexts) {
    auditTotal += await seedAuditLogs(supabase, ctx);
  }
  console.log(`  → ${auditTotal} audit logs`);

  console.log("[seed] Paiements…");
  let pay = 0;
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    pay += await seedPayments(supabase, ctx, schoolStudents);
  }
  console.log(`  → ${pay} paiements`);

  console.log("[seed] Messages WhatsApp (table d’extension)…");
  let wa = 0;
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    wa += await seedWhatsapp(supabase, ctx, schoolStudents);
  }
  console.log(`  → ${wa} messages`);

  console.log("[seed] Profils apprentissage + insights IA…");
  let prof = 0;
  let ins = 0;
  for (const ctx of contexts) {
    const schoolStudents = studentsBySchool.get(ctx.spec.id) ?? [];
    const r = await seedProfilesAndInsights(supabase, ctx, schoolStudents);
    prof += r.profiles;
    ins += r.insights;
  }
  console.log(`  → ${prof} profils, ${ins} insights`);

  console.log("[seed] Done.");
  console.log(
    JSON.stringify(
      {
        schools: ACTIVE_SCHOOL_SPECS.length,
        principalSchool: ACTIVE_SCHOOL_SPECS[0].name,
        students: allStudents.length,
        teachers: totalTeachers,
        evaluationsApprox: totalEval,
        grades: totalGrades,
        attendanceRows: att,
        academicMetrics: metricsCount,
        riskDistribution: riskTotals,
        reportsPublished: reportsCount,
        notifications: notifTotals,
        conversations: convTotal,
        messages: msgTotal,
        auditLogs: auditTotal,
        payments: pay,
        whatsappExtension: wa,
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
