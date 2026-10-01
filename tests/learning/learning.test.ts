import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { demoCatalog, validateAnswer } from "../../apps/api/server/handlers/learning.mjs";
import { canAccessExamSubjects, isLevelCompatible, recommendExercises } from "../../apps/mobile/src/lib/learningRules.ts";

test("filtre les contenus par niveau et série", () => {
  assert.equal(isLevelCompatible("Terminale C", "Terminale C"), true);
  assert.equal(isLevelCompatible("Terminale générale — spécialité mathématiques", "Terminale C"), false);
  assert.equal(isLevelCompatible("Première", "Terminale C"), false);
});

test("l’éligibilité examen dépend de la configuration du niveau", () => {
  assert.equal(canAccessExamSubjects({ isExamLevel: true }), true);
  assert.equal(canAccessExamSubjects({ isExamLevel: false }), false);
});

test("valide nombres avec virgule, tolérance et fractions équivalentes", () => {
  assert.equal(validateAnswer("0,5", { expected_answer: "1/2", validation_config: { type: "rational", value: .5 } }, 1).status, "correct");
  assert.equal(validateAnswer("2/4", { expected_answer: "1/2", validation_config: { type: "rational", value: .5 } }, 1).status, "correct");
  assert.equal(validateAnswer("0,501", { expected_answer: .5, validation_config: { type: "numeric", value: .5, tolerance: .01 } }, 1).status, "correct");
});

test("vrai/faux peut exiger une justification", () => {
  const secret = { expected_answer: "V", validation_config: { type: "boolean", value: true, requires_justification: true } };
  assert.equal(validateAnswer("Vrai", secret, 1).status, "needs_justification");
  assert.equal(validateAnswer("Vrai car les probabilités se complètent", secret, 1).status, "correct");
});

test("les choix multiples et l’ordre sont validés sans IA", () => {
  const multiple = { expected_answer: ["a", "c"], validation_config: { type: "multiple_choice", correct: ["a", "c"] } };
  const ordering = { expected_answer: ["b", "c", "a"], validation_config: { type: "ordering", correct: ["b", "c", "a"] } };
  assert.equal(validateAnswer(JSON.stringify(["c", "a"]), multiple, 1).status, "correct");
  assert.equal(validateAnswer(JSON.stringify(["a", "c", "b"]), ordering, 1).status, "incorrect");
  assert.equal(validateAnswer(JSON.stringify(["b", "c", "a"]), ordering, 1).validator, "deterministic");
});

test("la banque guidée v3 contient les dix sessions et 96 étapes", async () => {
  const bank = JSON.parse(await readFile(new URL("../../data/exams/6eme-maths-guided-sessions-v3.json", import.meta.url), "utf8"));
  assert.equal(bank.metadata.version, "3.0.0");
  assert.equal(bank.sessions.length, 10);
  assert.equal(bank.sessions.reduce((sum: number, session: { session_flow: unknown[] }) => sum + session.session_flow.length, 0), 96);
  assert.ok(bank.sessions.every((session: { id: string; statement_before_guidance: boolean }) => session.id.startsWith("CI-6M-V2-") && session.statement_before_guidance));
});

test("le catalogue public ne contient ni réponse, ni validation, ni correction", async () => {
  const catalog = await demoCatalog();
  const serialized = JSON.stringify(catalog);
  for (const forbidden of ["expected_answer", "solution_steps", "validation_config", "correction_metadata"]) assert.equal(serialized.includes(forbidden), false);
  assert.ok(catalog.exercises.length >= 20);
  assert.equal(catalog.exams.length, 2);
});

test("les recommandations restent au même niveau et dans la même matière", () => {
  const base = { id: "a", level: "Terminale C", subject: "Mathématiques", chapter: "Suites", difficulty: "moyen", questions: [] } as never;
  const same = { ...base, id: "b" } as never;
  const otherLevel = { ...base, id: "c", level: "Première" } as never;
  assert.deepEqual(recommendExercises(base, [otherLevel, same], [], 3).map((item) => item.id), ["b"]);
});

test("l’import protège l’idempotence et la transaction", async () => {
  const source = await readFile(new URL("../../scripts/import-learning-content.ts", import.meta.url), "utf8");
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /on conflict\(external_id\) do update/g);
  assert.match(source, /sql\.begin/);
  assert.match(source, /position = position \+ \$\{positionOffset\}/);
  assert.match(source, /position >= \$\{positionOffset\}/);
});

test("l’interface charge les parcours progressivement", async () => {
  const panel = await readFile(new URL("../../apps/mobile/src/features/revision/LearningAssignmentsPanel.tsx", import.meta.url), "utf8");
  const solver = await readFile(new URL("../../apps/mobile/src/features/revision/LearningSolverPage.tsx", import.meta.url), "utf8");
  assert.match(panel, /getLearningDiscovery/);
  assert.match(panel, /getLearningPath/);
  assert.match(panel, /learningSessionScore/);
  assert.doesNotMatch(panel, /getLearningCatalog/);
  assert.match(solver, /getLearningContent/);
  assert.doesNotMatch(solver, /getLearningCatalog/);
});

test("le parcours de calcul littéral contient le diagnostic, huit sessions et l’évaluation", async () => {
  const bank = JSON.parse(await readFile(new URL("../../data/exams/3eme-maths-calcul-litteral-path-v1.json", import.meta.url), "utf8"));
  assert.equal(bank.metadata.level, "3ème");
  assert.equal(bank.metadata.unlock_score, 60);
  assert.equal(bank.sessions.filter((item: { path_kind: string }) => item.path_kind === "session").length, 8);
  assert.equal(bank.sessions.filter((item: { path_kind: string }) => item.path_kind === "diagnostic").length, 1);
  assert.equal(bank.sessions.filter((item: { path_kind: string }) => item.path_kind === "evaluation").length, 1);
  assert.ok(bank.sessions.every((item: { session_flow: unknown[] }) => item.session_flow.length >= 7));
  const courseSessions = bank.sessions.filter((item: { path_kind: string }) => item.path_kind === "session");
  assert.ok(courseSessions.every((item: { session_flow: Array<{ type: string }> }) => item.session_flow.filter((step) => step.type === "lesson").length >= 3));
  assert.ok(courseSessions.every((item: { session_flow: Array<{ type: string }> }) => item.session_flow.filter((step) => ["single_choice", "multiple_choice"].includes(step.type)).length >= 5));
});

test("les sessions v3 affichent les cours et vérifient les réponses à la fin", async () => {
  const solver = await readFile(new URL("../../apps/mobile/src/features/revision/LearningSolverPage.tsx", import.meta.url), "utf8");
  const experience = await readFile(new URL("../../apps/mobile/src/features/revision/GuidedSessionExperience.tsx", import.meta.url), "utf8");
  assert.match(solver, /mode === "exam" \|\| guidedV3/);
  assert.match(solver, /question\.questionType !== "guided_solution"/);
  assert.match(solver, /\.\.\.flow, \.\.\.\(correction \? \[correction\] : \[\]\)/);
  assert.match(experience, /onCompleteStep\(answer\.value\)/);
  assert.doesNotMatch(experience, /onValidate/);
  assert.match(experience, /GeneratedActionIcon name="hint"/);
  assert.doesNotMatch(experience, /Avais-tu trouvé|Oui, j’avais trouvé/);
  assert.match(experience, /Terminer la session/);
});

test("la validation ouverte passe par GPT côté serveur", async () => {
  const api = await readFile(new URL("../../apps/api/server/handlers/learning.mjs", import.meta.url), "utf8");
  assert.match(api, /assessWithGpt/);
  assert.match(api, /gpt_assisted/);
  assert.match(api, /learning_ai_evaluations/);
  assert.doesNotMatch(api, /VITE_.*OPENAI.*KEY/);
});
