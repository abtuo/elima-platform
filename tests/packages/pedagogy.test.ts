import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PedagogicalResourceBundleSchema,
  adaptResourceToLearning,
  projectPrintableStudentView,
  projectPrintableTeacherView,
  projectStudentView,
  projectTeacherView,
  validateLatexExpression,
  validatePedagogicalBundle,
} from "../../packages/pedagogy/src/index.ts";

async function fixture(name: string) {
  return JSON.parse(await readFile(new URL(`../../packages/pedagogy/resources/${name}`, import.meta.url), "utf8")) as unknown;
}

async function mathFixture() {
  return fixture("mathematiques-3e-equations-premier-degre.json");
}

async function svtFixture() {
  return fixture("svt-terminale-d-tissu-nerveux.json");
}

test("les deux ressources de référence respectent le schéma et les règles métier", async () => {
  for (const input of [await mathFixture(), await svtFixture()]) {
    const result = validatePedagogicalBundle(input);
    assert.equal(result.success, true, JSON.stringify(result.errors, null, 2));
    assert.ok(result.data);
    assert.ok(result.warnings.some((warning) => warning.code === "EXPERT_REVIEW_REQUIRED"));
    assert.equal(result.data.document.metadata.validationStatus, "pending_expert_review");
  }
});

test("les ressources couvrent les attendus Mathématiques et SVT", async () => {
  const math = PedagogicalResourceBundleSchema.parse(await mathFixture());
  const svt = PedagogicalResourceBundleSchema.parse(await svtFixture());
  const mathQuestions = math.document.blocks.filter((block) => block.type === "question");
  const svtQuestions = svt.document.blocks.filter((block) => block.type === "question");
  assert.equal(mathQuestions.length, 8);
  assert.equal(svtQuestions.length, 8);
  assert.equal(math.document.metadata.declaredTotalPoints, 20);
  assert.equal(svt.document.metadata.declaredTotalPoints, 20);
  assert.ok(svt.document.blocks.some((block) => block.type === "chart"));
  assert.ok(svt.document.blocks.filter((block) => block.type === "diagram").length >= 2);
  assert.ok(svt.document.blocks.some((block) => block.type === "table"));
  assert.ok(math.document.blocks.some((block) => block.type === "formula"));
});

test("un JSON structurellement invalide produit une erreur exploitable", () => {
  const result = validatePedagogicalBundle({ document: { id: "x" }, secrets: {} });
  assert.equal(result.success, false);
  assert.equal(result.errors[0].level, "structural");
  assert.equal(result.errors[0].code, "SCHEMA_INVALID");
  assert.match(result.errors[0].path, /^bundle/);
});

test("les doublons, références brisées et barèmes incohérents sont rejetés", async () => {
  const input = PedagogicalResourceBundleSchema.parse(await mathFixture());
  input.document.blocks[1].id = input.document.blocks[0].id;
  const assessment = input.document.blocks.find((block) => block.type === "assessment");
  assert.ok(assessment && assessment.type === "assessment");
  assessment.declaredPoints = 19;
  const question = input.document.blocks.find((block) => block.type === "question");
  assert.ok(question && question.type === "question");
  question.question.skillRefs.push("skill.absente");
  const result = validatePedagogicalBundle(input);
  assert.equal(result.success, false);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_ID"));
  assert.ok(result.errors.some((error) => error.code === "ASSESSMENT_POINTS_MISMATCH"));
  assert.ok(result.errors.some((error) => error.code === "UNKNOWN_COMPETENCY_REFERENCE"));
});

test("les grilles et les corrigés sont obligatoires et cohérents", async () => {
  const missing = PedagogicalResourceBundleSchema.parse(await mathFixture());
  missing.secrets.corrections.pop();
  const missingResult = validatePedagogicalBundle(missing);
  assert.ok(missingResult.errors.some((error) => error.code === "MISSING_CORRECTION"));

  const wrongPoints = PedagogicalResourceBundleSchema.parse(await mathFixture());
  wrongPoints.secrets.corrections[0].rubric[0].points = 0.5;
  const pointResult = validatePedagogicalBundle(wrongPoints);
  assert.ok(pointResult.errors.some((error) => error.code === "RUBRIC_POINTS_MISMATCH"));
});

test("les contrats numériques contrôlent unités et tolérances", async () => {
  const input = PedagogicalResourceBundleSchema.parse(await mathFixture());
  const correction = input.secrets.corrections.find((item) => item.questionId === "math.q5");
  assert.equal(correction?.answerKey.kind, "numeric");
  if (correction?.answerKey.kind === "numeric") {
    assert.equal(correction.answerKey.unit, "km");
    correction.answerKey.tolerance = -1;
  }
  const result = validatePedagogicalBundle(input);
  assert.equal(result.success, false);
  assert.ok(result.errors.some((error) => error.level === "structural"));
});

test("le contrôle LaTeX refuse les expressions déséquilibrées ou dangereuses", () => {
  assert.deepEqual(validateLatexExpression("x=-\\frac{b}{a}"), []);
  assert.ok(validateLatexExpression("x=\\frac{b}{a").length > 0);
  assert.ok(validateLatexExpression("\\href{https://example.com}{x}").length > 0);
});

test("la sérialisation JSON conserve intégralement le bundle", async () => {
  const parsed = PedagogicalResourceBundleSchema.parse(await svtFixture());
  const roundTrip = PedagogicalResourceBundleSchema.parse(JSON.parse(JSON.stringify(parsed)));
  assert.deepEqual(roundTrip, parsed);
});

test("les projections publiques ne contiennent aucun corrigé", async () => {
  const input = await mathFixture();
  const student = projectStudentView(input);
  const printable = projectPrintableStudentView(input);
  const serialized = JSON.stringify({ student, printable });
  for (const forbidden of ["answerKey", "correctionMarkdown", "solutionSteps", "hints", "rubric", "teacherComments", "secrets"]) {
    assert.equal(serialized.includes(`"${forbidden}"`), false, forbidden);
  }
  assert.equal(student.audience, "student");
  assert.equal(printable.print.includeAnswerSpaces, true);
});

test("les projections enseignant conservent les secrets après validation canonique", async () => {
  const input = await mathFixture();
  const teacher = projectTeacherView(input);
  const printable = projectPrintableTeacherView(input, { includeTeacherComments: false });
  const printableWithoutRubrics = projectPrintableTeacherView(input, { includeRubrics: false });
  assert.equal(teacher.secrets.corrections.length, 8);
  assert.equal(printable.audience, "teacher_print");
  assert.ok(printable.secrets.corrections.every((correction) => correction.teacherComments === undefined));
  assert.ok(printableWithoutRubrics.secrets.corrections.every((correction) => correction.rubric.length === 0));
});

test("l’adaptateur Learning sépare les champs publics et privés", async () => {
  const result = adaptResourceToLearning(await mathFixture());
  assert.equal(result.supported.length, 8);
  assert.equal(result.unsupported.length, 0);
  const serializedPublic = JSON.stringify(result.supported.map((item) => item.publicQuestion));
  assert.equal(serializedPublic.includes("expectedAnswer"), false);
  assert.equal(serializedPublic.includes("solutionSteps"), false);
  assert.ok(result.supported[0].publicQuestion.skills.includes("skill.transformer"));
  assert.ok(result.supported.some((item) => item.privateQuestion.validationConfig.type === "numeric"));
});

test("l’adaptateur signale les formats Learning non pris en charge sans les forcer", async () => {
  const result = adaptResourceToLearning(await svtFixture());
  assert.deepEqual(result.supported.map((item) => item.publicQuestion.externalId), ["svt.q1", "svt.q2", "svt.q4"]);
  assert.deepEqual(result.unsupported.map((item) => item.questionId), ["svt.q3", "svt.q5", "svt.q6", "svt.q7", "svt.q8"]);
  assert.ok(result.unsupported.every((item) => item.reason.includes("pas de contrat équivalent sûr")));
});
