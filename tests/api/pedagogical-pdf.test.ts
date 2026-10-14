/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  buildChartGeometry,
  projectPrintableStudentView,
  projectPrintableTeacherView,
  validatePedagogicalBundle,
} from "../../packages/pedagogy/src/index.ts";
import { createHandler } from "../../apps/api/server/handlers/pedagogical-export.mjs";
import { PedagogicalApiError } from "../../apps/api/server/pedagogy/authorization.mjs";
import { buildPedagogicalPdf, latexToReadable } from "../../apps/api/server/pedagogy/pdf/service.mjs";
import { renderLatexPng } from "../../apps/api/server/pedagogy/pdf/latex.mjs";

const mathUrl = new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url);
const svtUrl = new URL("../../packages/pedagogy/resources/svt-terminale-d-tissu-nerveux.json", import.meta.url);
const versionId = "11111111-1111-4111-8111-111111111111";

async function fixture(url: URL) { return JSON.parse(await readFile(url, "utf8")); }
function response() { return { statusCode: 0, body: undefined as unknown, headers: new Map<string, string>(), setHeader(name: string, value: string) { this.headers.set(name, value); return this; }, getHeader(name: string) { return this.headers.get(name); }, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; }, end() { return this; } }; }

test("les PDF élève et enseignant sont A4, multipages et portent des métadonnées neutres", async () => {
  const bundle = await fixture(mathUrl);
  const studentBytes = await buildPedagogicalPdf(projectPrintableStudentView(bundle), { generatedAt: new Date("2026-10-11T00:00:00Z") });
  const teacherBytes = await buildPedagogicalPdf(projectPrintableTeacherView(bundle), { generatedAt: new Date("2026-10-11T00:00:00Z") });
  const student = await PDFDocument.load(studentBytes); const teacher = await PDFDocument.load(teacherBytes);
  assert.ok(student.getPageCount() > 1); assert.ok(teacher.getPageCount() >= student.getPageCount());
  assert.equal(student.getTitle(), bundle.document.metadata.title); assert.equal(student.getAuthor(), "Elima");
  assert.equal(student.getSubject()?.includes("Mathématiques"), true);
  for (const document of [student, teacher]) for (const page of document.getPages()) {
    const { width, height } = page.getSize(); assert.ok(Math.abs(width - 595.28) < 0.1); assert.ok(Math.abs(height - 841.89) < 0.1);
  }
  assert.notEqual(Buffer.from(studentBytes).toString("base64"), Buffer.from(teacherBytes).toString("base64"));
});

test("la projection transmise au générateur élève ne contient jamais de corrigé", async () => {
  const bundle = await fixture(mathUrl); let captured: unknown;
  const resourceService = { async getVersion(_actor: unknown, _id: string, options: { includePrivate?: boolean }) {
    assert.equal(options.includePrivate, false);
    return { resource: { title: bundle.document.metadata.title }, version: { id: versionId, versionNumber: 3, view: { audience: "student", document: bundle.document } } };
  } };
  const handler = createHandler({
    authorize: async () => ({ user: { id: "teacher-a" }, admin: {} }),
    actor: async () => ({ userId: "teacher-a", schoolId: "school-a", role: "TEACHER", membershipStatus: "active" }),
    resourceService,
    buildPdf: async (view: unknown) => { captured = view; return new Uint8Array([37, 80, 68, 70]); },
    generatedAt: () => new Date("2026-10-11T00:00:00Z"),
  });
  const res = response(); await handler({ method: "POST", body: { versionId, audience: "student" }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  const serialized = JSON.stringify(captured);
  for (const forbidden of ["secrets", "correctionMarkdown", "answerKey", "rubric", "teacherComments"]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("la projection enseignant conserve corrigés et barèmes après autorisation", async () => {
  const bundle = await fixture(mathUrl); let captured: any;
  const handler = createHandler({
    authorize: async () => ({ user: { id: "teacher-a" }, admin: {} }),
    actor: async () => ({ userId: "teacher-a", schoolId: "school-a", role: "TEACHER", membershipStatus: "active" }),
    resourceService: { async getVersion() { return { resource: { title: bundle.document.metadata.title }, version: { id: versionId, versionNumber: 2, view: { audience: "teacher", document: bundle.document, secrets: bundle.secrets } } }; } },
    buildPdf: async (view: unknown) => { captured = view; return new Uint8Array([37, 80, 68, 70]); },
  });
  const res = response(); await handler({ method: "POST", body: { versionId, audience: "teacher" }, headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.equal(captured.audience, "teacher_print");
  assert.equal(captured.secrets.corrections.length, 8); assert.ok(captured.secrets.corrections.some((item: any) => item.rubric.length));
});

test("un élève ne peut pas obtenir la projection enseignant", async () => {
  const handler = createHandler({
    authorize: async () => ({ user: { id: "student-a" }, admin: {} }),
    actor: async () => ({ userId: "student-a", schoolId: "school-a", role: "STUDENT", membershipStatus: "active" }),
    resourceService: { async getVersion(actor: any, _id: string, options: any) { if (actor.role === "STUDENT" && options.includePrivate) throw new PedagogicalApiError("Accès refusé.", 403, "pedagogical_access_denied"); } },
  });
  const res = response(); await handler({ method: "POST", body: { versionId, audience: "teacher" }, headers: {} }, res);
  assert.equal(res.statusCode, 403); assert.equal((res.body as any).code, "pedagogical_access_denied");
});

test("LaTeX, graphiques et assets scientifiques restent déterministes et validés", async () => {
  assert.equal(latexToReadable("ax+b=0 \\Longrightarrow x=-\\frac{b}{a},\\quad a\\neq 0"), "ax+b=0  =>  x=-(b)/(a),   a !=  0");
  const renderedFormula = await renderLatexPng("x=-\\frac{b}{a}");
  assert.deepEqual([...renderedFormula.png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(renderedFormula.width > renderedFormula.height);
  const bundle = await fixture(svtUrl); const chart = bundle.document.blocks.find((block: any) => block.type === "chart");
  const geometry = buildChartGeometry(chart, 720, 360);
  assert.equal(geometry.series[0].points.length, chart.xAxis.values.length);
  assert.ok(geometry.series[0].points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.equal(chart.xAxis.unit, "ms"); assert.equal(chart.yAxis.unit, "mV");
  const incompleteSeries = structuredClone(bundle); const incompleteChart = incompleteSeries.document.blocks.find((block: any) => block.type === "chart"); incompleteChart.series[0].values.pop();
  const incompleteValidation = validatePedagogicalBundle(incompleteSeries);
  assert.equal(incompleteValidation.success, false); assert.ok(incompleteValidation.errors.some((item) => item.code === "CHART_LENGTH_MISMATCH"));
  const invalidValue = structuredClone(bundle); const invalidChart = invalidValue.document.blocks.find((block: any) => block.type === "chart"); invalidChart.series[0].values[0] = Number.POSITIVE_INFINITY;
  assert.equal(validatePedagogicalBundle(invalidValue).success, false);
  const withMissingAsset = structuredClone(bundle); withMissingAsset.document.blocks.push({ id: "image.absente", type: "image", assetId: "asset.coupe-histologique", alt: "Coupe histologique", sourceRefIds: [] });
  const validation = validatePedagogicalBundle(withMissingAsset);
  assert.equal(validation.success, true); assert.ok(validation.warnings.some((item) => item.code === "SCIENTIFIC_ASSET_MISSING"));
  const bytes = await buildPedagogicalPdf(projectPrintableStudentView(bundle)); assert.ok(bytes.length > 10_000);
});
 
