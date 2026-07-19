import { readFile } from "node:fs/promises";
import postgres from "postgres";

const source = JSON.parse(await readFile("data/exams/6eme-maths-guided-sessions-v3.json", "utf8"));
const sessionIds = source.sessions.map((session: { id: string }) => session.id);
const stepCount = source.sessions.reduce((sum: number, session: { session_flow: unknown[] }) => sum + session.session_flow.length, 0);
if (source.metadata?.version !== "3.0.0" || sessionIds.length !== 10 || stepCount !== 96 || sessionIds.some((id: string) => !id.startsWith("CI-6M-V2-"))) {
  throw new Error("La banque guidée v3 ne respecte pas le contrat attendu.");
}

console.log("Source locale :", { version: source.metadata.version, sessions: sessionIds.length, steps: stepCount });

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) process.exit(0);
const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });
try {
  const rows = await sql`
    select e.external_id, e.status, e.source_type,
      count(distinct a.id)::int as attempts,
      count(distinct ans.id)::int as answers,
      count(distinct q.id)::int as questions
    from public.learning_exercises e
    left join public.learning_attempts a on a.exercise_id=e.id
    left join public.learning_answers ans on ans.attempt_id=a.id
    left join public.learning_questions q on q.exercise_id=e.id
    where e.external_id like 'CI-6M-%'
    group by e.id
    order by e.external_id`;
  console.table(rows);
  const types = await sql`
    select q.question_type, count(*)::int as count
    from public.learning_questions q
    join public.learning_exercises e on e.id=q.exercise_id
    where e.source_type='guided_session_v3' and e.status='published'
    group by q.question_type order by q.question_type`;
  const [summary] = await sql`
    select
      count(distinct e.id)::int as sessions,
      count(distinct q.id)::int as questions,
      count(distinct h.id)::int as hints,
      coalesce(max(h.level), 0)::int as max_hint_level
    from public.learning_exercises e
    left join public.learning_questions q on q.exercise_id=e.id
    left join public.learning_question_hints h on h.question_id=q.id
    where e.source_type='guided_session_v3' and e.status='published'`;
  console.table(types);
  console.log("Résumé guidé v3 :", summary);
  if (summary.sessions !== 10 || summary.questions !== 106 || summary.hints !== 49 || summary.max_hint_level !== 3) {
    throw new Error("Le contenu guidé v3 importé est incomplet.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
