import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import {
  projectPrintableStudentView,
  projectPrintableTeacherView,
  projectStudentView,
  validatePedagogicalBundle,
} from "../../../packages/pedagogy/src/index.ts";
import { buildPedagogicalPdf } from "../server/pedagogy/pdf/service.mjs";

const fixtures = [
  "mathematiques-3e-equations-premier-degre.json",
  "svt-terminale-d-tissu-nerveux.json",
];

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function measure(label, iterations, operation) {
  const values = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    await operation();
    values.push(performance.now() - start);
  }
  return {
    label,
    iterations,
    medianMs: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
  };
}

const bundles = await Promise.all(fixtures.map(async (name) => JSON.parse(await readFile(new URL(`../../../packages/pedagogy/resources/${name}`, import.meta.url), "utf8"))));
const [math, svt] = bundles;
const validation = await measure("validation_bundle", 30, () => validatePedagogicalBundle(svt));
const studentProjection = await measure("projection_eleve", 100, () => projectStudentView(math));
const pdfStudent = projectPrintableStudentView(svt);
const pdfTeacher = projectPrintableTeacherView(svt);
const studentPdf = await measure("pdf_svt_eleve", 3, () => buildPedagogicalPdf(pdfStudent));
const teacherPdf = await measure("pdf_svt_enseignant", 3, () => buildPedagogicalPdf(pdfTeacher));
const bytes = await buildPedagogicalPdf(pdfTeacher);
const rawBytes = bytes.length;
const base64Bytes = Buffer.byteLength(Buffer.from(bytes).toString("base64"));

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${process.platform}/${process.arch}`,
  fixtures: fixtures.length,
  metrics: [validation, studentProjection, studentPdf, teacherPdf],
  payload: {
    teacherPdfBytes: rawBytes,
    teacherPdfBase64Bytes: base64Bytes,
    base64OverheadPercent: Number((((base64Bytes / rawBytes) - 1) * 100).toFixed(2)),
  },
  memory: {
    rssMiB: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
    heapUsedMiB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
  },
}, null, 2));
