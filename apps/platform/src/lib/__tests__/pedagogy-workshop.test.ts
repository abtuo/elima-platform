import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PedagogicalResourceBundleSchema, projectStudentView, projectTeacherView } from "@elima/pedagogy";
import { advanceGeneration, generationIdempotencyKey, loadGenerationIds, rememberGenerationId, validateGenerationRequest } from "../pedagogy/generation-controller";
import { appendBlock, createBasicBlock, moveBlock, removeBlock, replaceBlock, validateEditedBundle } from "../pedagogy/editor";

test("l'atelier est active par le mecanisme de plan existant", async () => {
  const page = await readFile(new URL("../../app/teacher/resources/page.tsx", import.meta.url), "utf8");
  assert.match(page, /DashboardPlanGate feature="ai_import"/);
});

async function fixture(name: string) {
  return PedagogicalResourceBundleSchema.parse(JSON.parse(await readFile(new URL(`../../../../../packages/pedagogy/resources/${name}`, import.meta.url), "utf8")));
}

const validRequest = { level: "3e", subject: "Mathématiques", chapter: "Équations", objectives: ["Résoudre une équation"], competencies: ["Raisonner"], resourceType: "mixed_support" as const, difficulty: "progressive" as const, exerciseCount: 8, estimatedMinutes: 60, targetAudience: "student" as const, detailLevel: "standard" as const };

test("le formulaire applique le contrat backend et refuse les valeurs excessives", () => {
  const valid = validateGenerationRequest(validRequest);
  assert.equal(valid.success, true);
  assert.equal(validateGenerationRequest({ ...validRequest, exerciseCount: 21 }).success, false);
  assert.equal(validateGenerationRequest({ ...validRequest, estimatedMinutes: 9 }).success, false);
  if (!valid.success) throw new Error("fixture invalide");
  assert.match(generationIdempotencyKey(valid.data, 123), /^platform-123-/);
});

test("les identifiants persistants sont dédupliqués pour la reprise", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  rememberGenerationId(storage, "job-one"); rememberGenerationId(storage, "job-two"); rememberGenerationId(storage, "job-one");
  assert.deepEqual(loadGenerationIds(storage), ["job-one", "job-two"]);
});

test("le contrôleur exécute une seule étape et respecte les états terminaux", async () => {
  let calls = 0;
  const running = { id: "job", request: validRequest, status: "running", currentStep: "content", attempts: 0, maxAttempts: 3, updatedAt: "2026-10-10" } as const;
  const api = { generationStatus: async () => running, processGeneration: async () => { calls += 1; return { ...running, currentStep: "exercises" as const }; } };
  assert.equal((await advanceGeneration(api as never, "job")).currentStep, "exercises"); assert.equal(calls, 1);
  const done = { generationStatus: async () => ({ ...running, status: "succeeded" as const }), processGeneration: async () => { calls += 1; return running; } };
  await advanceGeneration(done as never, "job"); assert.equal(calls, 1);
});

test("l’éditeur manipule les blocs sans casser le schéma", async () => {
  const source = await fixture("mathematiques-3e-equations-premier-degre.json"); const first = source.document.blocks[0];
  assert.equal(moveBlock(source, first.id, 1).document.blocks[1].id, first.id);
  const heading = createBasicBlock("heading", "test.heading"); const added = appendBlock(source, heading);
  assert.equal(added.document.blocks.at(-1)?.id, "test.heading");
  if (heading.type !== "heading") throw new Error("bloc titre attendu");
  const changed = replaceBlock(added, { ...heading, text: "Titre modifié" });
  assert.equal(validateEditedBundle(removeBlock(changed, "test.heading")).success, true);
});

test("les projections du renderer couvrent Mathématiques et SVT et séparent les corrigés", async () => {
  for (const name of ["mathematiques-3e-equations-premier-degre.json", "svt-terminale-d-tissu-nerveux.json"]) {
    const bundle = await fixture(name);
    const student = projectStudentView(bundle); const teacher = projectTeacherView(bundle);
    assert.equal("secrets" in student, false); assert.ok(teacher.secrets.corrections.length > 0);
    if (name.startsWith("mathematiques")) assert.ok(student.document.blocks.some((block) => block.type === "formula"));
    else { assert.ok(student.document.blocks.some((block) => block.type === "table")); assert.ok(student.document.blocks.some((block) => block.type === "diagram")); }
  }
});
