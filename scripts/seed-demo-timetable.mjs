import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";
import { DEMO_SCHOOL_ID, DEMO_WEEK_END, DEMO_WEEK_START, demoTimetable } from "./lib/demo-timetable-data.mjs";

const EPS_ACCOUNT = {
  email: "enseignant.roland@elima.school",
  fullName: "M. Roland Kassi",
  password: process.env.SEED_AUTH_PASSWORD || "ElimaSeed!2026",
};
const fixedRooms = new Map([
  ["6ème B", "Bâtiment A · Salle 3"],
  ["3ème A", "Bâtiment B · Salle 6"],
]);
const specialRooms = new Map([
  ["EPS", "Terrain multisports"],
  ["SVT", "Laboratoire SVT"],
  ["Physique-Chimie", "Laboratoire Physique-Chimie"],
]);

function minutes(start, end) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - startHour * 60 - startMinute;
}

function validateSchedule() {
  const dailyCounts = new Map();
  const teacherSubjects = new Map();
  const teacherClasses = new Map();
  const durations = new Set();
  const teacherSlots = new Map();
  const classSlots = new Map();
  for (const event of demoTimetable) {
    const key = `${event.className}|${event.date}`;
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    if (!teacherSubjects.has(event.teacherEmail)) teacherSubjects.set(event.teacherEmail, new Set());
    if (!teacherClasses.has(event.teacherEmail)) teacherClasses.set(event.teacherEmail, new Set());
    teacherSubjects.get(event.teacherEmail).add(event.subject);
    teacherClasses.get(event.teacherEmail).add(event.className);
    durations.add(minutes(event.start, event.end));
    for (const [slots, key] of [[teacherSlots, `${event.teacherEmail}|${event.date}`], [classSlots, `${event.className}|${event.date}`]]) {
      const values = slots.get(key) ?? [];
      values.push(event);
      slots.set(key, values);
    }
    const expectedRoom = specialRooms.get(event.subject) ?? fixedRooms.get(event.className);
    if (event.room !== expectedRoom) throw new Error(`Salle incohérente pour ${event.className} / ${event.subject}.`);
  }
  for (const [key, count] of dailyCounts) if (count < 2 || count > 3) throw new Error(`${key} contient ${count} cours au lieu de 2 à 3.`);
  for (const [email, subjects] of teacherSubjects) if (subjects.size > 1) throw new Error(`${email} enseigne plusieurs matières dans la démo.`);
  for (const [email, classes] of teacherClasses) if (classes.size > 2) throw new Error(`${email} enseigne dans plus de deux classes.`);
  for (const [scope, slots] of [["professeur", teacherSlots], ["classe", classSlots]]) {
    for (const [key, events] of slots) {
      const ordered = [...events].sort((a, b) => a.start.localeCompare(b.start));
      for (let index = 1; index < ordered.length; index += 1) {
        if (ordered[index].start < ordered[index - 1].end) throw new Error(`Chevauchement ${scope} (${key}) : ${ordered[index - 1].start}-${ordered[index - 1].end} et ${ordered[index].start}-${ordered[index].end}.`);
      }
    }
  }
  if (![60, 90].every((duration) => durations.has(duration)) || durations.size !== 2) throw new Error("La démo doit utiliser exactement des séances de 60 et 90 minutes.");
  return { events: demoTimetable.length, classDays: dailyCounts.size, teachers: teacherSubjects.size, durations: [...durations].sort() };
}

const validation = validateSchedule();
if (process.argv.includes("--check")) {
  console.log(JSON.stringify({ ok: true, ...validation }, null, 2));
  process.exit(0);
}

const config = getTargetConfig();
await verifyServerKey(config);
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const parsedDbUrl = new URL(databaseUrl);
const directRef = parsedDbUrl.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
const poolerRef = decodeURIComponent(parsedDbUrl.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
if ((directRef ?? poolerRef) !== config.targetRef) throw new Error("SUPABASE_DB_URL ne désigne pas le projet Supabase configuré.");

const admin = createClient(config.url, config.serverKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: demoSchool, error: schoolError } = await admin.from("schools").select("id, is_demo").eq("id", DEMO_SCHOOL_ID).maybeSingle();
if (schoolError) throw schoolError;
if (!demoSchool?.is_demo) throw new Error("Refus de sécurité : l'établissement cible n'est pas marqué comme démonstration.");
let { data: epsUser, error: epsLookupError } = await admin.from("users").select("id").eq("email", EPS_ACCOUNT.email).maybeSingle();
if (epsLookupError) throw epsLookupError;
if (!epsUser?.id) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EPS_ACCOUNT.email,
    password: EPS_ACCOUNT.password,
    email_confirm: true,
    user_metadata: { role: "TEACHER", school_id: DEMO_SCHOOL_ID, full_name: EPS_ACCOUNT.fullName },
  });
  if (error || !data.user?.id) throw new Error(`Création du professeur EPS impossible : ${error?.message ?? "utilisateur absent"}`);
  const { error: profileError } = await admin.from("users").upsert({ id: data.user.id, email: EPS_ACCOUNT.email, school_id: DEMO_SCHOOL_ID, role: "TEACHER", full_name: EPS_ACCOUNT.fullName });
  if (profileError) throw profileError;
  epsUser = { id: data.user.id };
}
const { error: teacherError } = await admin.from("teachers").upsert({ school_id: DEMO_SCHOOL_ID, user_id: epsUser.id, primary_subject: "EPS" }, { onConflict: "user_id" });
if (teacherError) throw teacherError;

const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const classes = await tx`select id, name from public.classes where school_id = ${DEMO_SCHOOL_ID} and name in ${tx([...fixedRooms.keys()])}`;
    const subjects = await tx`select id, name from public.subjects where school_id = ${DEMO_SCHOOL_ID} and name in ${tx([...new Set(demoTimetable.map((event) => event.subject))])}`;
    const emails = [...new Set(demoTimetable.map((event) => event.teacherEmail))];
    const teachers = await tx`select t.id, lower(u.email) as email from public.teachers t join public.users u on u.id = t.user_id where t.school_id = ${DEMO_SCHOOL_ID} and lower(u.email) in ${tx(emails)}`;
    const classByName = new Map(classes.map((row) => [row.name, row.id]));
    const subjectByName = new Map(subjects.map((row) => [row.name, row.id]));
    const teacherByEmail = new Map(teachers.map((row) => [row.email, row.id]));
    for (const event of demoTimetable) {
      if (!classByName.has(event.className)) throw new Error(`Classe absente : ${event.className}. Lancez d'abord le seed scolaire.`);
      if (!subjectByName.has(event.subject)) throw new Error(`Matière absente : ${event.subject}. Lancez d'abord le seed scolaire.`);
      if (!teacherByEmail.has(event.teacherEmail)) throw new Error(`Professeur absent : ${event.teacherEmail}.`);
    }

    for (const [className, room] of fixedRooms) await tx`update public.classes set default_room = ${room} where id = ${classByName.get(className)}`;
    const teacherIds = [...teacherByEmail.values()];
    await tx`delete from public.class_teachers where teacher_id in ${tx(teacherIds)}`;
    await tx`delete from public.teacher_subject_classes where teacher_id in ${tx(teacherIds)}`;
    await tx`delete from public.timetable_events where school_id = ${DEMO_SCHOOL_ID} and starts_at >= ${`${DEMO_WEEK_START}T00:00:00.000Z`} and starts_at < ${`${DEMO_WEEK_END}T00:00:00.000Z`}`;

    const assignments = [...new Map(demoTimetable.map((event) => {
      const row = { class_id: classByName.get(event.className), teacher_id: teacherByEmail.get(event.teacherEmail), subject_id: subjectByName.get(event.subject) };
      return [`${row.class_id}|${row.teacher_id}|${row.subject_id}`, row];
    })).values()];
    await tx`insert into public.class_teachers ${tx(assignments)} on conflict (class_id, teacher_id, subject_id) do nothing`;
    await tx`insert into public.teacher_subject_classes ${tx(assignments)} on conflict (teacher_id, class_id, subject_id) do nothing`;

    const events = demoTimetable.map((event) => ({
      school_id: DEMO_SCHOOL_ID,
      class_id: classByName.get(event.className),
      teacher_id: teacherByEmail.get(event.teacherEmail),
      subject_id: subjectByName.get(event.subject),
      starts_at: `${event.date}T${event.start}:00.000Z`,
      ends_at: `${event.date}T${event.end}:00.000Z`,
      room: event.room,
    }));
    await tx`insert into public.timetable_events ${tx(events)}`;
  });
} finally {
  await sql.end({ timeout: 5 });
}

console.log(JSON.stringify({ ok: true, schoolId: DEMO_SCHOOL_ID, week: `${DEMO_WEEK_START}/${DEMO_WEEK_END}`, ...validation }, null, 2));
