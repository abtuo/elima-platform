import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const roots = [
  new URL("../../packages/revision-core/src/", import.meta.url),
  new URL("../../packages/revision-ui/src/", import.meta.url),
];

async function packageSources() {
  const sources: Array<{ file: string; source: string }> = [];
  for (const root of roots) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) sources.push({ file: join(root.pathname, entry.name), source: await readFile(new URL(entry.name, root), "utf8") });
    }
  }
  return sources;
}

test("revision-core reste indépendant de React et des routeurs", async () => {
  const sources = (await packageSources()).filter(({ file }) => file.includes("revision-core"));
  for (const { file, source } of sources) {
    assert.doesNotMatch(source, /(?:from|import\()\s*["'](?:react|react-dom|react-router)/, file);
    assert.doesNotMatch(source, /\.tsx$/, file);
  }
});

test("les packages Révision n'importent aucune application ni feature School", async () => {
  for (const { file, source } of await packageSources()) {
    assert.doesNotMatch(source, /apps\/(?:mobile|platform)|@\/(?:features\/(?:admin|teacher|parent)|types\/school|services\/mainDataService)/i, file);
    assert.doesNotMatch(source, /(?:Admin|Teacher|Parent)(?:Page|Dashboard|Service)/, file);
  }
});

test("revision-ui ne connaît aucune route Mobile", async () => {
  const sources = (await packageSources()).filter(({ file }) => file.includes("revision-ui"));
  for (const { file, source } of sources) {
    assert.doesNotMatch(source, /\/student\/reviser|navigate\(|useNavigate|react-router/, file);
  }
});

test("revision-ui expose le renderer pedagogique partage et ses replis scientifiques surs", async () => {
  const source = await readFile(new URL("../../packages/revision-ui/src/PedagogicalRenderer.tsx", import.meta.url), "utf8");
  for (const block of ["heading", "rich_text", "definition", "callout", "formula", "worked_example", "summary", "image", "table", "chart", "diagram", "question", "exercise_group", "guided_activity", "assessment", "document_analysis"]) {
    assert.match(source, new RegExp(`case ["']${block}["']`));
  }
  assert.match(source, /safeImageUri/);
  assert.match(source, /ScientificChart/); assert.match(source, /ScientificDiagram/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("les rendus scientifiques sont des SVG déclaratifs, accessibles et réutilisent la géométrie canonique", async () => {
  const chart = await readFile(new URL("../../packages/revision-ui/src/ScientificChart.tsx", import.meta.url), "utf8");
  const diagram = await readFile(new URL("../../packages/revision-ui/src/ScientificDiagram.tsx", import.meta.url), "utf8");
  for (const source of [chart, diagram]) {
    assert.match(source, /<svg/); assert.match(source, /role="img"/); assert.match(source, /overflow-x-auto/);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|<script/i);
  }
  assert.match(chart, /buildChartGeometry/); assert.match(diagram, /buildDiagramGeometry/);
});
