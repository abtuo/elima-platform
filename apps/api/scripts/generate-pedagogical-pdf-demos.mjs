import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectPrintableStudentView, projectPrintableTeacherView } from "../../../packages/pedagogy/src/index.ts";
import { buildPedagogicalPdf } from "../server/pedagogy/pdf/service.mjs";

const output = resolve(import.meta.dirname, "../../../output/pdf");
const generatedAt = new Date("2026-10-11T00:00:00Z");
const demos = [
  ["mathematiques-3e-equations-premier-degre.json", "elima-mathematiques-3e"],
  ["svt-terminale-d-tissu-nerveux.json", "elima-svt-terminale-d"],
];

await mkdir(output, { recursive: true });
for (const [fixtureName, stem] of demos) {
  const source = new URL(`../../../packages/pedagogy/resources/${fixtureName}`, import.meta.url);
  const bundle = JSON.parse(await readFile(source, "utf8"));
  const variants = [
    ["eleve", projectPrintableStudentView(bundle)],
    ["enseignant", projectPrintableTeacherView(bundle)],
  ];
  for (const [audience, view] of variants) {
    const bytes = await buildPedagogicalPdf(view, { generatedAt });
    const target = resolve(output, `${stem}-${audience}.pdf`);
    await writeFile(target, bytes);
    console.log(`${target} (${bytes.length} octets)`);
  }
}
