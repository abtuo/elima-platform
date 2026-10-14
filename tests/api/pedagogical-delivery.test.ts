/* eslint-disable @typescript-eslint/no-explicit-any -- dépôt mémoire dédié aux frontières du service */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createPedagogicalRevisionService, correctionCanBeRevealed } from "../../apps/api/server/pedagogy/revision/service.mjs";

const load = (name: string) => readFile(new URL(`../../packages/pedagogy/resources/${name}`, import.meta.url), "utf8").then(JSON.parse);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

class DeliveryRepository {
  bundle: any; tenant = "school-a"; assigned = true; activeEnrollment = true;
  attempts: any[] = []; answers: any[] = [];
  constructor(bundle: any) { this.bundle = bundle; }
  async getStudentContext(user: string) { return user === "student-local" ? { localUserId: user, schoolId: this.tenant, studentId: "student-a", classId: "class-a", enrollmentActive: this.activeEnrollment } : null; }
  async listCandidateAssignments(context: any) { return this.assigned && context.schoolId === "school-a" ? [{ assignmentId: "assignment-a", publicationId: "publication-a", resourceId: "resource-a", versionId: "version-a", schoolId: "school-a", studentId: "student-a", title: this.bundle.document.metadata.title, subject: this.bundle.document.metadata.subject, level: this.bundle.document.metadata.level, chapter: this.bundle.document.metadata.chapter, publicationState: "active", channel: "revision", activityMode: "training", maxAttempts: 2, revealAfterAttempts: 2, correctionsPolicy: "after_submission", availableFrom: "2026-10-01T00:00:00Z", availableUntil: "2026-10-20T00:00:00Z" }] : []; }
  async getPublicVersion() { return { versionNumber: 1, publicDocument: clone(this.bundle.document) }; }
  async getVersionBundle() { return clone(this.bundle); }
  async listAttempts(user: string, publication: string) { return clone(this.attempts.filter((item) => item.localUserId === user && item.publicationId === publication)); }
  async getAttemptByKey(user: string, publication: string, key: string) { return clone(this.attempts.find((item) => item.localUserId === user && item.publicationId === publication && item.key === key) ?? null); }
  async createAttempt(input: any) { const value = { ...input, key: input.idempotencyKey, status: "in_progress", answeredCount: 0, score: 0, pendingReviewCount: 0 }; this.attempts.push(value); return clone(value); }
  async getAttempt(id: string) { return clone(this.attempts.find((item) => item.id === id) ?? null); }
  async getAnswerByKey(attemptId: string, questionId: string, key: string) { return clone(this.answers.find((item) => item.attemptId === attemptId && item.questionId === questionId && item.key === key) ?? null); }
  async countQuestionAnswers(attemptId: string, questionId: string) { return this.answers.filter((item) => item.attemptId === attemptId && item.questionId === questionId).length; }
  async createAnswer(input: any) { const value = { ...input, key: input.submissionKey }; this.answers.push(value); return clone(value); }
  async refreshAttemptMetrics() {}
  async submitAttempt(id: string, at: string) { const value = this.attempts.find((item) => item.id === id); value.status = "submitted"; value.submittedAt = at; return clone(value); }
}

async function scenario(name: string) {
  const repository = new DeliveryRepository(await load(name)); let sequence = 0;
  const service = createPedagogicalRevisionService(repository, { now: () => new Date("2026-10-10T12:00:00Z"), uuid: () => `generated-${++sequence}` });
  return { repository, service };
}

test("la liste et la lecture élève ne divulguent aucun secret pédagogique", async () => {
  const { service } = await scenario("mathematiques-3e-equations-premier-degre.json");
  assert.equal((await service.list("student-local")).items.length, 1);
  const content = await service.content("student-local", "publication-a");
  const serialized = JSON.stringify(content);
  for (const marker of ["secrets", "answerKey", "correctionMarkdown", "privateContent"]) assert.equal(serialized.includes(marker), false, marker);
});

test("le parcours Mathématiques 3e réutilise la correction déterministe Learning et reste idempotent", async () => {
  const { repository, service } = await scenario("mathematiques-3e-equations-premier-degre.json");
  const first = await service.start("student-local", "publication-a", "attempt-key-a");
  assert.equal((await service.start("student-local", "publication-a", "attempt-key-a")).id, first.id);
  const answer1: any = await service.answer("student-local", { attemptId: first.id, questionId: "math.q1", answer: "math.q1.b", submissionKey: "answer-key-1" });
  assert.equal(answer1.evaluationStatus, "correct"); assert.equal(answer1.correction, null);
  const answer2: any = await service.answer("student-local", { attemptId: first.id, questionId: "math.q1", answer: "math.q1.b", submissionKey: "answer-key-2" });
  assert.match(answer2.correction.explanationMarkdown, /soustraire 7/i);
  assert.equal(repository.answers.length, 2);
  assert.equal((await service.answer("student-local", { attemptId: first.id, questionId: "math.q1", answer: "x", submissionKey: "answer-key-2" }) as any).evaluationStatus, "correct");
});

test("le parcours SVT ne prétend pas auto-noter une analyse scientifique ouverte", async () => {
  const { service } = await scenario("svt-terminale-d-tissu-nerveux.json");
  const attempt = await service.start("student-local", "publication-a", "svt-attempt-key");
  const result: any = await service.answer("student-local", { attemptId: attempt.id, questionId: "svt.q5", answer: "Analyse argumentée du document.", submissionKey: "svt-answer-key" });
  assert.equal(result.evaluationStatus, "pending_review");
  assert.equal(result.isCorrect, null); assert.equal(result.scoreAwarded, null);
});

test("l’affectation et l’inscription active sont revérifiées à chaque accès", async () => {
  const { repository, service } = await scenario("mathematiques-3e-equations-premier-degre.json");
  const attempt = await service.start("student-local", "publication-a", "attempt-key-b");
  repository.activeEnrollment = false;
  await assert.rejects(() => service.content("student-local", "publication-a"), (error: any) => error.code === "pedagogical_support_unavailable");
  await assert.rejects(() => service.answer("student-local", { attemptId: attempt.id, questionId: "math.q1", answer: "math.q1.b", submissionKey: "blocked-answer" }), (error: any) => error.code === "pedagogical_support_unavailable");
  assert.deepEqual((await service.list("other-tenant-user")).items, []);
});

test("les politiques de corrigé sont décidées côté serveur", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  assert.equal(correctionCanBeRevealed({ policy: "teacher_only", attemptsCount: 9, now, submitted: true }), false);
  assert.equal(correctionCanBeRevealed({ policy: "after_submission", revealAfterAttempts: 2, attemptsCount: 1, now, submitted: true }), false);
  assert.equal(correctionCanBeRevealed({ policy: "after_submission", revealAfterAttempts: 2, attemptsCount: 2, now, submitted: true }), true);
  assert.equal(correctionCanBeRevealed({ policy: "after_due_date", attemptsCount: 1, dueAt: "2026-10-09T00:00:00Z", now, submitted: false }), true);
});

test("la migration Phase 5 est additive, versionnée et sans altération de Learning", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/20261010140000_pedagogical_revision_delivery.sql", import.meta.url), "utf8");
  assert.match(sql, /pedagogical_revision_attempts/); assert.match(sql, /version_id uuid not null/);
  assert.match(sql, /enable row level security/); assert.match(sql, /local_user_id = auth\.uid\(\)/);
  assert.match(sql, /publish_pedagogical_resource_version_configured/);
  assert.doesNotMatch(sql, /\b(drop table|truncate)\b/i);
  assert.doesNotMatch(sql, /alter table public\.learning_/i);
});

test("la publication et ses paramètres Révision utilisent une seule transaction", async () => {
  const repository = await readFile(new URL("../../apps/api/server/pedagogy/supabaseRepository.mjs", import.meta.url), "utf8");
  const method = repository.slice(repository.indexOf("async publishVersion"), repository.indexOf("async getPublication"));
  assert.match(method, /rpc\("publish_pedagogical_resource_version_configured"/);
  assert.doesNotMatch(method, /from\("pedagogical_publications"\)\.update/);
});

test("la migration Phase 5 s’exécute sur PostgreSQL après le socle pédagogique", async (context) => {
  const db = new PGlite(); context.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create type public.app_role as enum ('STUDENT','PARENT','TEACHER','SCHOOL_ADMIN','SUPER_ADMIN','COMPTABLE');
    create table public.schools(id uuid primary key);
    create table public.users(id uuid primary key, school_id uuid references public.schools(id), role public.app_role);
    create table public.subjects(id uuid primary key, school_id uuid references public.schools(id));
    create table public.classes(id uuid primary key, school_id uuid references public.schools(id));
    create table public.students(id uuid primary key, school_id uuid references public.schools(id));
    create table public.teachers(id uuid primary key, school_id uuid references public.schools(id), user_id uuid references public.users(id));
    create table public.class_teachers(class_id uuid references public.classes(id), teacher_id uuid references public.teachers(id), subject_id uuid references public.subjects(id));
    create table public.teacher_subject_classes(id uuid primary key, class_id uuid references public.classes(id), teacher_id uuid references public.teachers(id), subject_id uuid references public.subjects(id));
    create table public.school_memberships(id uuid primary key, school_id uuid references public.schools(id), user_id uuid references public.users(id), role public.app_role, status text, is_primary boolean);
  `);
  const phase2 = await readFile(new URL("../../supabase/migrations/20261010120000_pedagogical_authoring_backend.sql", import.meta.url), "utf8");
  await db.exec(phase2.replace("create extension if not exists pgcrypto;", ""));
  const phase5 = await readFile(new URL("../../supabase/migrations/20261010140000_pedagogical_revision_delivery.sql", import.meta.url), "utf8");
  await db.exec(phase5);
  const tables = await db.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema='public' and table_name like 'pedagogical_revision_%' order by table_name");
  assert.deepEqual(tables.rows.map((row) => row.table_name), ["pedagogical_revision_answers", "pedagogical_revision_attempts"]);
});
