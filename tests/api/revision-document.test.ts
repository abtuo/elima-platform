import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHandler, matchesFileSignature } from "../../apps/api/server/handlers/revision-document-analyze.mjs";
import { documentError, extractDocument } from "../../apps/api/server/revisionDocumentService.mjs";

function response() {
  return { headers: new Map<string, string>(), statusCode: 200, body: undefined as unknown,
    setHeader(name: string, value: string) { this.headers.set(name, value); return this; }, getHeader(name: string) { return this.headers.get(name); },
    status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; }, end() { return this; } };
}

function fixture(overrides: Record<string, unknown> = {}) {
  const calls = { extract: 0, quota: 0, structure: [] as Array<Record<string, unknown>>, inserts: [] as Array<Record<string, unknown>> };
  const admin = {
    from() { return { insert(value: Record<string, unknown>) { calls.inserts.push(value); return { select() { return { async single() { return { data: { id: "document-1", created_at: "2026-09-28T12:00:00Z" }, error: null }; } }; } }; } }; },
    storage: { from() { return { async remove() { return { error: null }; } }; } },
  };
  const handler = createHandler({
    async authorize(request: { headers?: { authorization?: string } }) {
      if (!request.headers?.authorization) throw documentError(401, "authentication_required", "Connexion requise.");
      return { user: { id: "student-1" }, admin };
    },
    async consumeQuota() { calls.quota += 1; },
    async extractDocument() { calls.extract += 1; return { text: "Cours suffisamment long sur le théorème de Thalès.", paragraphs: [], tables: [], pages: [] }; },
    async createPedagogicalAnalysis(_extraction: unknown, input: Record<string, unknown>) { calls.structure.push(input); return { title: "Thalès", detectedSubject: "Mathématiques", detectedLevel: "3ème", documentType: "cours", summary: "Résumé", concepts: ["Thalès"], explanations: [], keyPoints: [], vocabulary: [], sourceWarnings: [], extractedText: "Texte" }; },
    ...overrides,
  });
  return { handler, calls };
}

test("upload document non authentifié refusé avant Azure", async () => {
  const { handler, calls } = fixture(); const res = response();
  await handler({ method: "POST", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401); assert.equal((res.body as { code: string }).code, "authentication_required"); assert.equal(calls.extract, 0);
});

test("format documentaire invalide refusé", async () => {
  const { handler, calls } = fixture(); const res = response();
  await handler({ method: "POST", headers: { authorization: "Bearer token" }, body: { mimeType: "text/plain", contentBase64: "dGVzdA==" } }, res);
  assert.equal(res.statusCode, 415); assert.equal((res.body as { code: string }).code, "invalid_document_format"); assert.equal(calls.extract, 0);
});

test("document analysé, niveau transmis et résultat conservé sans fichier original", async () => {
  const { handler, calls } = fixture(); const res = response();
  await handler({ method: "POST", headers: { authorization: "Bearer token" }, body: { fileName: "devoir.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("%PDF-document").toString("base64"), level: "3ème", selectedSubjects: ["Mathématiques"] } }, res);
  assert.equal(res.statusCode, 201); assert.equal((res.body as { status: string }).status, "ready"); assert.equal(calls.quota, 1);
  assert.equal(calls.structure[0].level, "3ème"); assert.equal(calls.inserts[0].user_id, "student-1");
  assert.equal("content_base64" in calls.inserts[0], false); assert.equal("file" in calls.inserts[0], false);
});

test("erreur Azure renvoyée sans détail fournisseur", async () => {
  const { handler } = fixture({ async extractDocument() { throw documentError(502, "document_analysis_failed", "Azure indisponible."); } }); const res = response();
  await handler({ method: "POST", headers: { authorization: "Bearer token" }, body: { fileName: "devoir.png", mimeType: "image/png", contentBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64") } }, res);
  assert.equal(res.statusCode, 502); assert.deepEqual(res.body, { code: "document_analysis_failed", message: "L’analyse du document est momentanément indisponible." });
});

test("les signatures PDF, JPEG et PNG sont vérifiées côté serveur", () => {
  assert.equal(matchesFileSignature(Buffer.from("%PDF-test"), "application/pdf"), true);
  assert.equal(matchesFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0x01]), "image/jpeg"), true);
  assert.equal(matchesFileSignature(Buffer.from("not-a-pdf"), "application/pdf"), false);
});

test("Azure Document Intelligence utilise prebuilt-layout et traite le polling", async () => {
  const urls: string[] = [];
  const fetchImpl = async (url: string) => { urls.push(url); if (urls.length === 1) return new Response("", { status: 202, headers: { "operation-location": "https://azure.example/operations/1" } }); return Response.json({ status: "succeeded", analyzeResult: { content: "Un contenu documentaire suffisamment long.", paragraphs: [], tables: [], pages: [] } }); };
  const result = await extractDocument(Buffer.from("pdf"), "application/pdf", { env: { AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: "https://azure.example", AZURE_DOCUMENT_INTELLIGENCE_KEY: "secret" }, fetchImpl, wait: async () => {} });
  assert.match(urls[0], /prebuilt-layout:analyze/); assert.equal(result.text, "Un contenu documentaire suffisamment long.");
});

test("le QCM documentaire crée des questions inédites sur les mêmes notions", async () => {
  const source = await readFile(new URL("../../apps/api/server/handlers/revision-generate.mjs", import.meta.url), "utf8");
  assert.match(source, /questions entièrement nouvelles/); assert.match(source, /Ne copie, ne reformule et ne complète aucune question/);
  assert.match(source, /nouveaux contextes, exemples, données et formulations/); assert.match(source, /compréhension et le transfert/);
});
