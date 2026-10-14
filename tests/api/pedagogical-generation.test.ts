/* eslint-disable @typescript-eslint/no-explicit-any -- doubles mémoire du pipeline et du fournisseur */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PedagogicalGenerationRequestSchema, validatePedagogicalBundle } from "../../packages/pedagogy/src/index.ts";
import { createAzurePedagogicalGenerationClient, parseStrictJson } from "../../apps/api/server/pedagogy/generation/azureClient.mjs";
import { GenerationPlanSchema } from "../../apps/api/server/pedagogy/generation/contracts.mjs";
import { applyRepairPatch, createPedagogicalGenerationService } from "../../apps/api/server/pedagogy/generation/service.mjs";

const actor = { userId: "teacher-a", schoolId: "school-a", role: "TEACHER", membershipStatus: "active" };
const activityTypes = new Set(["question", "exercise_group", "guided_activity", "assessment", "document_analysis"]);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

class JobRepository {
  jobs = new Map<string, any>(); quotaReservations = 0; aiCalls = 0;
  async findJobByIdempotency(schoolId: string, userId: string, key: string) { return [...this.jobs.values()].find((job) => job.schoolId === schoolId && job.createdByUserId === userId && job.idempotencyKey === key) ?? null; }
  async reserveQuota() { this.quotaReservations += 1; }
  async createJob(input: any) { const value = { ...input, status: "queued", currentStep: "plan", artifacts: {}, attempts: 0, maxAttempts: 3, lockVersion: 1 }; this.jobs.set(input.id, value); return clone(value); }
  async getJob(id: string) { return clone(this.jobs.get(id) ?? null); }
  async claimJob(id: string, lock: number) { const item = this.jobs.get(id); if (!item || item.lockVersion !== lock) return null; item.status = "running"; item.lockVersion += 1; return clone(item); }
  async reserveAiCall() { this.aiCalls += 1; }
  async completeStep(id: string, lock: number, input: any) { const item = this.jobs.get(id); assert.equal(item.lockVersion, lock); item.artifacts[input.step] = clone(input.artifact); item.currentStep = input.nextStep ?? item.currentStep; item.status = input.succeeded ? "succeeded" : "running"; item.lockVersion += 1; if (input.succeeded) { item.resultResourceId = input.artifact.resourceId; item.resultVersionId = input.artifact.versionId; } return clone(item); }
  async failStep(id: string, lock: number, input: any) { const item = this.jobs.get(id); assert.equal(item.lockVersion, lock); item.status = "failed"; item.error = input; item.attempts += 1; item.lockVersion += 1; return clone(item); }
  async retryJob(id: string) { const item = this.jobs.get(id); item.status = "queued"; item.error = null; return clone(item); }
  async cancelJob(id: string) { const item = this.jobs.get(id); item.status = "cancelled"; return clone(item); }
}

function requestFromFixture(bundle: any) {
  const metadata = bundle.document.metadata;
  return {
    country: "Côte d’Ivoire", countryCode: metadata.countryCode ?? "CI",
    educationSystem: metadata.educationSystem ?? "Système éducatif ivoirien", language: metadata.language,
    level: metadata.level, ...(metadata.track ? { track: metadata.track } : {}), subject: metadata.subject,
    chapter: metadata.chapter, objectives: metadata.objectives.map((item: any) => item.label),
    competencies: metadata.competencies.map((item: any) => item.label), resourceType: metadata.resourceType,
    difficulty: "progressive", exerciseCount: bundle.document.blocks.filter((block: any) => block.type === "question").length,
    estimatedMinutes: metadata.estimatedMinutes, targetAudience: "student", detailLevel: "detailed",
    totalPoints: metadata.declaredTotalPoints,
    references: metadata.references.map(({ locator, ...item }: any) => ({ ...item, ...(locator ? { version: locator } : {}) })),
  };
}

function fakeAiFor(bundle: any) {
  const blocks = clone(bundle.document.blocks).map((block: any) => block.type === "question" ? { ...block, question: { ...block.question, skillRefs: ["competency.1"] } } : block);
  const questions = blocks.filter((block: any) => block.type === "question");
  return {
    promptVersion: "test-prompt-v1",
    async generate(step: string) {
      let data;
      if (step === "plan") data = { title: bundle.document.metadata.title, description: bundle.document.metadata.description, objectives: bundle.document.metadata.objectives.map((item: any) => item.label), essentialConcepts: [bundle.document.metadata.chapter], sections: [{ id: "section.1", title: bundle.document.metadata.chapter, purpose: "Construire les connaissances et les appliquer." }], examples: ["Exemple guidé"], exerciseBlueprint: questions.map((block: any, index: number) => ({ index: index + 1, difficulty: block.question.difficulty === "progressive" ? "intermediate" : block.question.difficulty, questionType: block.question.type, points: block.question.points, concept: bundle.document.metadata.chapter })), totalPoints: bundle.document.metadata.declaredTotalPoints ?? 0 };
      if (step === "content") data = { blocks: blocks.filter((block: any) => !activityTypes.has(block.type)) };
      if (step === "exercises") data = { blocks: blocks.filter((block: any) => activityTypes.has(block.type)) };
      if (step === "corrections") data = { corrections: clone(bundle.secrets.corrections) };
      return { data, telemetry: { calls: 1, promptVersion: "test-prompt-v1", usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 } } };
    },
  };
}

async function runReference(file: string) {
  const fixture = JSON.parse(await readFile(new URL(`../../packages/pedagogy/resources/${file}`, import.meta.url), "utf8"));
  const repository = new JobRepository(); let persisted: any;
  const resourceService = { async createResource(_actor: any, input: any) { persisted = clone(input.bundle); return { resource: { id: "00000000-0000-4000-8000-000000000010", currentVersionId: "00000000-0000-4000-8000-000000000011" } }; } };
  const service = createPedagogicalGenerationService({ repository, aiClient: fakeAiFor(fixture), resourceService, uuid: () => "00000000-0000-4000-8000-000000000001" });
  const submitted = await service.submit(actor, requestFromFixture(fixture), `reference-${file.slice(0, 20)}`);
  for (let index = 0; index < 6; index += 1) await service.processNextStep(actor, submitted.id);
  return { fixture, repository, service, submitted, job: await repository.getJob(submitted.id), persisted };
}

test("le contrat de demande applique des limites et des valeurs par défaut", () => {
  const parsed = PedagogicalGenerationRequestSchema.parse({ level: "3e", subject: "Mathématiques", chapter: "Équations", objectives: ["Résoudre"], competencies: ["Calculer"], resourceType: "mixed_support" });
  assert.equal(parsed.exerciseCount, 8); assert.equal(parsed.countryCode, "CI");
  assert.equal(PedagogicalGenerationRequestSchema.safeParse({ ...parsed, exerciseCount: 21 }).success, false);
  assert.equal(PedagogicalGenerationRequestSchema.safeParse({ ...parsed, teacherInstructions: "x".repeat(4_001) }).success, false);
});

test("le parsing IA est strict et rejette le JSON invalide", () => {
  assert.equal(parseStrictJson('{"title":"T","description":"D","objectives":["O"],"essentialConcepts":["C"],"sections":[{"id":"s1","title":"S","purpose":"P"}],"examples":[],"exerciseBlueprint":[],"totalPoints":0}', GenerationPlanSchema).title, "T");
  assert.throws(() => parseStrictJson("texte non JSON", GenerationPlanSchema));
});

test("le client Azure réessaie les erreurs transitoires et suit tokens, mode et coût", async () => {
  let calls = 0; const bodies: any[] = [];
  const plan = { title: "Titre", description: "Description", objectives: ["Objectif"], essentialConcepts: ["Notion"], sections: [{ id: "section.1", title: "Section", purpose: "Apprendre" }], examples: [], exerciseBlueprint: [], totalPoints: 0 };
  const fetchImpl = async (_url: string, options: any) => {
    calls += 1; bodies.push(JSON.parse(options.body));
    if (calls === 1) return new Response(JSON.stringify({ error: { message: "busy" } }), { status: 429 });
    return Response.json({ model: "gpt-test", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(plan) } }], usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 } });
  };
  const client = createAzurePedagogicalGenerationClient({ env: { AZURE_OPENAI_ENDPOINT: "https://azure.example", AZURE_OPENAI_DEPLOYMENT: "deploy", AZURE_OPENAI_API_KEY: "secret", AZURE_OPENAI_INPUT_COST_PER_MILLION: "2", AZURE_OPENAI_OUTPUT_COST_PER_MILLION: "4" }, fetchImpl, wait: async () => {} });
  const generated = await client.generate("plan", { request: { subject: "Mathématiques" } });
  assert.equal(calls, 2); assert.equal(bodies[1].response_format.type, "json_schema");
  assert.equal(generated.telemetry.usage.totalTokens, 1500); assert.equal(generated.telemetry.estimatedCost, 0.004);
});

test("une réparation ciblée ne modifie aucun bloc non désigné", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url), "utf8"));
  const originalSecond = clone(fixture.document.blocks[1]);
  const replacement = { ...fixture.document.blocks[0], text: "Titre réparé" };
  const repaired = applyRepairPatch(fixture, { blocks: [replacement], corrections: [] });
  assert.equal(repaired.document.blocks[0].text, "Titre réparé");
  assert.deepEqual(repaired.document.blocks[1], originalSecond);
  assert.throws(() => applyRepairPatch(fixture, { blocks: [{ ...replacement, id: "bloc.inconnu" }], corrections: [] }));
});

test("le pipeline Mathématiques produit huit exercices, des corrigés et un brouillon non publié", async () => {
  const result = await runReference("mathematiques-3e-equations-premier-degre.json");
  assert.equal(result.job.status, "succeeded"); assert.equal(result.job.artifacts.persist.state, "draft");
  assert.equal(result.persisted.document.blocks.filter((block: any) => block.type === "question").length, 8);
  assert.equal(result.persisted.secrets.corrections.length, 8);
  assert.equal(validatePedagogicalBundle(result.persisted).success, true);
  const publicStatus = await result.service.status(actor, result.submitted.id);
  assert.equal(JSON.stringify(publicStatus).includes("correctionMarkdown"), false);
  await assert.rejects(() => result.service.status({ ...actor, schoolId: "school-b" }, result.submitted.id), (error: any) => error.code === "pedagogical_generation_not_found");
});

test("le pipeline SVT produit les exercices, la situation BAC et un barème sur 20", async () => {
  const result = await runReference("svt-terminale-d-tissu-nerveux.json");
  assert.equal(result.job.status, "succeeded"); assert.equal(result.persisted.document.metadata.declaredTotalPoints, 20);
  assert.ok(result.persisted.document.blocks.some((block: any) => block.type === "table"));
  assert.ok(result.persisted.document.blocks.some((block: any) => block.type === "diagram"));
  assert.equal(validatePedagogicalBundle(result.persisted).success, true);
});

test("la soumission est idempotente et réserve le quota une seule fois", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url), "utf8"));
  const repository = new JobRepository();
  const service = createPedagogicalGenerationService({ repository, aiClient: fakeAiFor(fixture), resourceService: {}, uuid: () => "00000000-0000-4000-8000-000000000001" });
  const first = await service.submit(actor, requestFromFixture(fixture), "same-request-key");
  const second = await service.submit(actor, requestFromFixture(fixture), "same-request-key");
  assert.equal(first.id, second.id); assert.equal(repository.quotaReservations, 1);
});

test("une erreur fournisseur échoue proprement puis autorise une reprise bornée", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url), "utf8"));
  const repository = new JobRepository();
  const aiClient = { promptVersion: "test", async generate() { throw Object.assign(new Error("Azure timeout"), { refundableProviderFailure: true, statusCode: 502, code: "azure_timeout" }); } };
  const service = createPedagogicalGenerationService({ repository, aiClient, resourceService: {}, uuid: () => "00000000-0000-4000-8000-000000000001" });
  const submitted = await service.submit(actor, requestFromFixture(fixture), "provider-failure-key");
  await assert.rejects(() => service.processNextStep(actor, submitted.id));
  assert.equal((await repository.getJob(submitted.id)).status, "failed");
  assert.equal((await service.retry(actor, submitted.id)).status, "queued");
});

test("les réparations invalides s’épuisent sans persister de ressource", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url), "utf8"));
  const base = fakeAiFor(fixture); let repairs = 0; let persisted = false;
  const aiClient = { ...base, async generate(step: string, context: any) { if (step === "corrections") return { data: { corrections: [] }, telemetry: { calls: 1 } }; if (step === "repair") { repairs += 1; return { data: { blocks: [], corrections: [] }, telemetry: { calls: 1 } }; } return base.generate(step, context); } };
  const repository = new JobRepository();
  const service = createPedagogicalGenerationService({ repository, aiClient, resourceService: { async createResource() { persisted = true; } }, uuid: () => "00000000-0000-4000-8000-000000000001" });
  const submitted = await service.submit(actor, requestFromFixture(fixture), "repair-exhaustion-key");
  for (let index = 0; index < 4; index += 1) await service.processNextStep(actor, submitted.id);
  await assert.rejects(() => service.processNextStep(actor, submitted.id), (error: any) => error.code === "generation_validation_exhausted");
  assert.equal(repairs, 2); assert.equal(persisted, false); assert.equal((await repository.getJob(submitted.id)).status, "failed");
  await assert.rejects(() => service.retry(actor, submitted.id), (error: any) => error.code === "generation_not_retryable");
});

test("la migration des jobs et quotas s’exécute dans PostgreSQL local", async (context) => {
  const db = new PGlite(); context.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
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
    create function public.current_user_school_id() returns uuid language sql stable as $$ select null::uuid $$;
    create function public.current_user_role() returns public.app_role language sql stable as $$ select null::public.app_role $$;
  `);
  const phase2 = await readFile(new URL("../../supabase/migrations/20261010120000_pedagogical_authoring_backend.sql", import.meta.url), "utf8");
  await db.exec(phase2.replace("create extension if not exists pgcrypto;", ""));
  const phase3 = await readFile(new URL("../../supabase/migrations/20261010130000_pedagogical_generation_jobs.sql", import.meta.url), "utf8");
  assert.doesNotMatch(phase3, /\b(drop table|truncate)\b/i);
  assert.doesNotMatch(phase3, /\b(quiz_|learning_)/i);
  await db.exec(phase3);
  const school = "00000000-0000-4000-8000-000000000001"; const user = "00000000-0000-4000-8000-000000000002";
  await db.query("insert into schools(id) values ($1)", [school]);
  await db.query("insert into users(id,school_id,role) values ($1,$2,'TEACHER')", [user, school]);
  const reserved = await db.query("select reserve_pedagogical_generation_job($1,$2) as allowed", [school, user]);
  assert.equal((reserved.rows[0] as any).allowed, true);
  for (let count = 1; count < 10; count += 1) assert.equal(((await db.query("select reserve_pedagogical_generation_job($1,$2) as allowed", [school, user])).rows[0] as any).allowed, true);
  assert.equal(((await db.query("select reserve_pedagogical_generation_job($1,$2) as allowed", [school, user])).rows[0] as any).allowed, false);
  const tables = await db.query("select count(*)::int as count from information_schema.tables where table_schema='public' and table_name like 'pedagogical_generation%' ");
  assert.equal((tables.rows[0] as any).count, 2);
});

