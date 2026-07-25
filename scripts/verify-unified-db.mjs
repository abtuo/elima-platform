import postgres from "postgres";
import { hasAnswerLetterAnchor } from "./lib/quiz-normalization.mjs";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const expected = { quiz_sets: 4407, quiz_questions: 44070, quiz_answers: 176280 };
const schemaOnly = process.argv.includes("--schema-only");
const config = getTargetConfig();
await verifyServerKey(config);
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const parsed = new URL(databaseUrl);
const ref = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]
  ?? decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
if (ref !== config.targetRef) throw new Error("La connexion PostgreSQL ne correspond pas au projet cible.");

const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
try {
  const counts = {};
  for (const table of Object.keys(expected)) {
    const [row] = await sql.unsafe(`select count(*)::int as count from public.${table}`);
    counts[table] = row.count;
    if (row.count !== expected[table]) throw new Error(`${table}: ${row.count}, attendu ${expected[table]}`);
  }

  const [invalidAnswers] = await sql`
    select count(*)::int as count from (
      select question_id from public.quiz_answers group by question_id
      having count(*) <> 4 or count(*) filter (where is_correct) <> 1
    ) invalid
  `;
  if (invalidAnswers.count) throw new Error(`${invalidAnswers.count} question(s) ont une structure de réponses invalide.`);

  const explanations = await sql`select id, explanation, hint from public.quiz_questions`;
  const anchored = explanations.filter((row) => hasAnswerLetterAnchor(row.explanation) || hasAnswerLetterAnchor(row.hint));
  if (anchored.length) throw new Error(`${anchored.length} question(s) contiennent encore une référence à une lettre de réponse.`);

  const histories = await sql`
    select lower(u.email) as email, count(a.id)::int as attempts
    from auth.users u left join public.quiz_attempts a on a.user_id = u.id
    where lower(u.email) in ('eleve.awa@demo.elima.invalid','eleve.yao@demo.elima.invalid','eleve.lina@demo.elima.invalid','eleve.eli@demo.elima.invalid')
    group by u.email order by u.email
  `;
  if (!schemaOnly && (histories.length !== 4 || histories.some((row) => row.attempts !== 6))) {
    throw new Error("L’historique de démonstration n’est pas complet.");
  }

  const policies = await sql`
    select tablename, count(*)::int as count
    from pg_policies where schemaname = 'public' and tablename in ('conversations','conversation_participants','messages')
    group by tablename order by tablename
  `;
  if (policies.length !== 3 || policies.some((row) => row.count < 1)) throw new Error("Politiques RLS de messagerie incomplètes.");

  const tenantFoundation = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('school_memberships', 'enrollments', 'school_features', 'documents', 'student_prospects', 'school_join_codes', 'auth_verification_challenges')
    order by table_name
  `;
  if (tenantFoundation.length !== 7) throw new Error("Le socle tenant unifié est incomplet.");
  const buckets = await sql`
    select id, public from storage.buckets
    where id in ('documents', 'elima-files', 'exam-sources')
    order by id
  `;
  if (buckets.length !== 3 || buckets.some((bucket) => bucket.public)) {
    throw new Error("Les buckets unifiés doivent exister et rester privés.");
  }

  async function visibleConversations(email) {
    const [actor] = await sql`select id, school_id, role from public.users where lower(email) = ${email}`;
    if (!actor) throw new Error(`Compte de recette absent : ${email}`);
    return sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claim.sub', ${actor.id}, true),
        set_config('request.jwt.claims', ${JSON.stringify({ sub: actor.id, role: "authenticated" })}, true)`;
      await tx.unsafe("set local role authenticated");
      return tx`select id, type from public.conversations order by type, id`;
    });
  }

  let messagingRls = null;
  if (!schemaOnly) {
    const teacherVisible = await visibleConversations("enseignant.maths.01@demo.elima.invalid");
    const forbiddenTeacherTypes = new Set(["payment_reminder", "store_order"]);
    if (teacherVisible.some((conversation) => forbiddenTeacherTypes.has(conversation.type))) {
      throw new Error("Un professeur peut voir une conversation financière ou boutique qui ne le concerne pas.");
    }
    const adminVisible = await visibleConversations("admin@demo.elima.invalid");
    const [schoolConversationCount] = await sql`
      select count(*)::int as count from public.conversations
      where school_id = 'a1111111-1111-4111-8111-111111110001'
    `;
    if (adminVisible.length !== schoolConversationCount.count) {
      throw new Error("L’administrateur ne peut pas consulter toutes les conversations de son école.");
    }
    messagingRls = {
      teacherVisible: teacherVisible.length,
      teacherForbiddenTypes: 0,
      adminVisible: adminVisible.length,
      schoolConversations: schoolConversationCount.count,
    };
  }

  console.log(JSON.stringify({ project: config.targetRef, counts, invalidAnswerStructures: 0,
    answerLetterAnchors: 0, demoHistories: histories, messagingPolicies: policies,
    tenantFoundation: tenantFoundation.map((row) => row.table_name),
    privateBuckets: buckets.map((bucket) => bucket.id), messagingRls }, null, 2));
} finally {
  await sql.end({ timeout: 5 });
}
