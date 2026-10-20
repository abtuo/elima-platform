import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createGeneratedQuizAttempt, generatedQuestionSnapshot, submitQuizAttempt } from "../../apps/api/server/revisionQuizAttempts.mjs";

const student = "00000000-0000-4000-8000-000000000201";
const other = "00000000-0000-4000-8000-000000000202";
const session = "00000000-0000-4000-8000-000000000203";

async function quizDatabase(context: { after(callback: () => unknown): void }) {
  const db = new PGlite(); context.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${student}'), ('${other}');
    create table public.user_progress(
      user_id uuid primary key references auth.users(id), xp integer not null default 0,
      streak_days integer not null default 0, completed_quiz_count integer not null default 0,
      average_score numeric(5,2) not null default 0, last_activity_date date,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create table public.quiz_attempts(
      id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
      quiz_ref text not null, subject_label text, topic text, source text not null default 'catalog',
      source_document_id uuid, score smallint not null, total_questions smallint not null,
      correct_answers smallint not null, earned_xp integer not null,
      completed_at timestamptz not null default now(), created_at timestamptz not null default now()
    );
    create table public.quiz_questions(id uuid primary key, prompt text);
    create table public.quiz_answers(id uuid primary key, question_id uuid, is_correct boolean);
    alter table public.quiz_questions enable row level security;
    alter table public.quiz_answers enable row level security;
    create policy quiz_questions_read on public.quiz_questions for select to authenticated using (true);
    create policy quiz_answers_read on public.quiz_answers for select to authenticated using (true);
    grant select on public.quiz_questions, public.quiz_answers to authenticated;
    create function public.record_quiz_attempt(text,text,integer,integer,integer,timestamptz)
      returns public.quiz_attempts language sql as $$ select null::public.quiz_attempts $$;
    grant execute on function public.record_quiz_attempt(text,text,integer,integer,integer,timestamptz) to authenticated;
    insert into public.quiz_attempts(user_id,quiz_ref,score,total_questions,correct_answers,earned_xp)
      values ('${student}','legacy',100,10,10,50);
    insert into public.user_progress(user_id,xp,streak_days,completed_quiz_count,average_score)
      values ('${student}',9999,999,500,100);
  `);
  const migration = await readFile(new URL("../../supabase/migrations/20261020180000_revision_verified_quiz_attempts.sql", import.meta.url), "utf8");
  await db.exec(migration);
  return db;
}

test("PostgreSQL: score recalculé, historique legacy conservé et remise idempotente", async (context) => {
  const db = await quizDatabase(context);
  const snapshot = JSON.stringify({ questions: [
    { id: "q1", prompt: "1+1", options: [{ id: "a1", text: "2" }, { id: "a2", text: "3" }], correctAnswerId: "a1", explanation: "1+1=2" },
    { id: "q2", prompt: "2+2", options: [{ id: "b1", text: "3" }, { id: "b2", text: "4" }], correctAnswerId: "b2", explanation: "2+2=4" },
  ] });
  await db.query("insert into quiz_attempt_sessions(id,user_id,quiz_ref,subject_label,question_snapshot) values($1,$2,'catalog','Mathématiques',$3::jsonb)", [session, student, snapshot]);

  const answers = JSON.stringify([{ questionId: "q1", answerId: "a2" }, { questionId: "q2", answerId: "b2" }]);
  const first = await db.query<{ result: { score: number; correctAnswers: number; earnedXp: number } }>("select submit_revision_quiz_attempt($1,$2,$3::jsonb) result", [session, student, answers]);
  const second = await db.query<{ result: { score: number; correctAnswers: number; earnedXp: number } }>("select submit_revision_quiz_attempt($1,$2,$3::jsonb) result", [session, student, answers]);
  assert.deepEqual(second.rows[0].result, first.rows[0].result);
  assert.equal(first.rows[0].result.score, 50);
  assert.equal(first.rows[0].result.correctAnswers, 1);
  assert.equal(first.rows[0].result.earnedXp, 25);

  const attempts = await db.query<{ score_trust: string; score: number }>("select score_trust,score from quiz_attempts order by created_at");
  assert.deepEqual(attempts.rows.map((row) => row.score_trust), ["legacy_client_reported", "server_verified"]);
  assert.equal(attempts.rows[1].score, 50);
  const progress = await db.query<{ xp: number; verified_xp: number; verified_completed_quiz_count: number }>("select xp,verified_xp,verified_completed_quiz_count from user_progress where user_id=$1", [student]);
  assert.equal(progress.rows[0].xp, 9999);
  assert.equal(progress.rows[0].verified_xp, 25);
  assert.equal(progress.rows[0].verified_completed_quiz_count, 1);
  assert.equal(attempts.rows.length, 2);
});

test("PostgreSQL: autre utilisateur, option forgée et accès client aux corrigés refusés", async (context) => {
  const db = await quizDatabase(context);
  const snapshot = JSON.stringify({ questions: [{ id: "q1", prompt: "?", options: [{ id: "a1", text: "Oui" }, { id: "a2", text: "Non" }], correctAnswerId: "a1" }] });
  await db.query("insert into quiz_attempt_sessions(id,user_id,quiz_ref,question_snapshot) values($1,$2,'catalog',$3::jsonb)", [session, student, snapshot]);
  await assert.rejects(db.query("select submit_revision_quiz_attempt($1,$2,$3::jsonb)", [session, other, JSON.stringify([{ questionId: "q1", answerId: "a1" }])]), /not found/i);
  await assert.rejects(db.query("select submit_revision_quiz_attempt($1,$2,$3::jsonb)", [session, student, JSON.stringify([{ questionId: "q1", answerId: "forged" }])]), /invalid answer option/i);

  const policies = await db.query<{ tablename: string; qual: string }>("select tablename,qual from pg_policies where schemaname='public' and tablename in ('quiz_attempt_sessions','quiz_questions','quiz_answers') order by tablename");
  assert.deepEqual(policies.rows.map((row) => row.tablename), ["quiz_answers", "quiz_questions"]);
  assert.ok(policies.rows.every((row) => /^\(?false\)?$/i.test(row.qual.replace(/\s+/g, ""))));
  const authenticatedExecute = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','public.submit_revision_quiz_attempt(uuid,uuid,jsonb)','execute') allowed");
  const legacyExecute = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','public.record_quiz_attempt(text,text,integer,integer,integer,timestamptz)','execute') allowed");
  assert.equal(authenticatedExecute.rows[0].allowed, false);
  assert.equal(legacyExecute.rows[0].allowed, false);
});

test("API: aucun score déclaré ni corrigé n'est accepté ou renvoyé avant remise", async () => {
  const snapshot = generatedQuestionSnapshot([{ question: "2+2", options: ["3", "4", "5", "6"], correctIndex: 1, explanation: "Quatre" }], () => 0);
  assert.equal(snapshot.questions[0].correctAnswerId.length > 0, true);
  let inserted: Record<string, unknown> | undefined;
  const admin = {
    from() { return { insert(value: Record<string, unknown>) { inserted = value; return { select() { return { async single() { return { data: { id: session }, error: null }; } }; } }; } }; },
    async rpc(_name: string, args: Record<string, unknown>) { return { data: { score: 100 }, error: null, args }; },
  };
  const started = await createGeneratedQuizAttempt(admin, student, { subject: "Mathématiques", topic: "Calcul" }, [{ question: "2+2", options: ["3", "4", "5", "6"], correctIndex: 1, explanation: "Quatre" }], { randomUUID: () => session, randomIndex: () => 0 });
  assert.equal("correctIndex" in started.questions[0], false);
  assert.equal("explanation" in started.questions[0], false);
  assert.equal(JSON.stringify(inserted).includes("correctAnswerId"), true);

  let rpcArgs: Record<string, unknown> = {};
  admin.rpc = async (_name: string, args: Record<string, unknown>) => { rpcArgs = args; return { data: { score: 100, scoreTrust: "server_verified" }, error: null, args }; };
  await submitQuizAttempt(admin, student, { attemptId: session, score: 0, correctAnswers: 0, answers: [{ questionId: "q1", answerId: "a1" }] });
  assert.equal("p_score" in rpcArgs, false);
  assert.equal("score" in rpcArgs, false);
});
