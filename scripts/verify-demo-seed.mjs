import postgres from "postgres";
import {
  assertDemoTarget,
  getTargetConfig,
  verifyServerKey,
} from "./lib/supabase-target.mjs";

const EXPECTED_SCHOOL = "Collège Moderne Abidjan";
const MULTI_PARENT_EMAIL = "parent.multi@demo.elima.invalid";
const config = getTargetConfig();
assertDemoTarget(config);
await verifyServerKey(config);

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est obligatoire.");
const parsedDatabaseUrl = new URL(databaseUrl);
const databaseRef =
  parsedDatabaseUrl.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1] ??
  decodeURIComponent(parsedDatabaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1] ??
  null;
if (databaseRef !== config.targetRef) {
  throw new Error("SUPABASE_DB_URL ne correspond pas au projet Demo vérifié.");
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  prepare: false,
  onnotice: () => {},
});

function assert(condition, message) {
  if (!condition) throw new Error(`[verify:demo] ${message}`);
}

try {
  const [school] = await sql`
    select count(*)::int as count, min(name) as name
    from public.schools
  `;
  assert(school.count === 1, `exactement une école attendue, reçu ${school.count}`);
  assert(school.name === EXPECTED_SCHOOL, `nom d'école inattendu : ${school.name}`);

  const [counts] = await sql`
    select
      (select count(*)::int from public.academic_years where is_current) as academic_years,
      (select count(*)::int from public.classes) as classes,
      (select count(*)::int from public.subjects) as subjects,
      (select count(*)::int from public.teachers) as teachers,
      (select count(*)::int from public.parents) as parents,
      (select count(*)::int from public.students) as students,
      (select count(*)::int from public.evaluations) as evaluations,
      (select count(*)::int from public.grades) as grades,
      (select count(*)::int from public.attendance) as attendance,
      (select count(*)::int from public.homeworks) as homeworks,
      (select count(*)::int from public.payments) as payments,
      (select count(*)::int from public.notifications) as notifications,
      (select count(*)::int from public.quiz_attempts) as quiz_attempts,
      (select count(*)::int from public.student_learning_profiles) as learning_profiles,
      (select count(*)::int from public.ai_insights) as recommendations
  `;
  assert(counts.academic_years === 1, "une année scolaire active est requise");
  assert(counts.classes >= 8 && counts.classes <= 12, `8 à 12 classes attendues, reçu ${counts.classes}`);
  assert(counts.subjects >= 10 && counts.subjects <= 15, `10 à 15 matières attendues, reçu ${counts.subjects}`);
  assert(counts.teachers >= 15 && counts.teachers <= 25, `15 à 25 enseignants attendus, reçu ${counts.teachers}`);
  assert(counts.parents >= 40 && counts.parents <= 80, `40 à 80 parents attendus, reçu ${counts.parents}`);
  assert(counts.students >= 80 && counts.students <= 150, `80 à 150 élèves attendus, reçu ${counts.students}`);
  for (const key of [
    "evaluations",
    "grades",
    "attendance",
    "homeworks",
    "payments",
    "notifications",
    "quiz_attempts",
    "learning_profiles",
    "recommendations",
  ]) {
    assert(counts[key] > 0, `${key} ne doit pas être vide`);
  }

  const paymentStatuses = new Set(
    (await sql`select distinct status from public.payments`).map((row) => row.status),
  );
  for (const status of ["paid", "partial", "pending", "late"]) {
    assert(paymentStatuses.has(status), `statut de paiement absent : ${status}`);
  }

  const family = await sql`
    select
      p.id as parent_id,
      count(distinct sp.student_id)::int as child_count,
      count(distinct s.class_id)::int as class_count,
      count(distinct g.student_id)::int as children_with_grades,
      count(distinct a.student_id)::int as children_with_attendance
    from public.users u
    join public.parents p on p.user_id = u.id
    join public.student_parents sp on sp.parent_id = p.id
    join public.students s on s.id = sp.student_id
    left join public.grades g on g.student_id = s.id
    left join public.attendance a on a.student_id = s.id
    where lower(u.email) = ${MULTI_PARENT_EMAIL}
    group by p.id
  `;
  assert(family.length === 1, "le parent multi-enfant doit avoir un profil unique");
  assert(family[0].child_count === 2, `le parent multi-enfant doit avoir exactement 2 enfants, reçu ${family[0].child_count}`);
  assert(family[0].class_count === 2, "les deux enfants doivent être dans des classes différentes");
  assert(family[0].children_with_grades === 2, "les deux enfants doivent avoir des notes");
  assert(family[0].children_with_attendance === 2, "les deux enfants doivent avoir des présences/absences");

  const [orphans] = await sql`
    select
      (select count(*) from public.users u left join public.schools s on s.id = u.school_id where u.school_id is not null and s.id is null) +
      (select count(*) from public.students st left join public.schools s on s.id = st.school_id where s.id is null) +
      (select count(*) from public.teachers t left join public.schools s on s.id = t.school_id where s.id is null) +
      (select count(*) from public.parents p left join public.schools s on s.id = p.school_id where s.id is null)
      as count
  `;
  assert(Number(orphans.count) === 0, `des données sont liées à un établissement inexistant (${orphans.count})`);

  console.log(JSON.stringify({ school: school.name, ...counts, multiParentChildren: family[0].child_count }, null, 2));
} finally {
  await sql.end({ timeout: 5 });
}
