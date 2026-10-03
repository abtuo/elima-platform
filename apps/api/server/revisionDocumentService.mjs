import { azureChat } from "./azureOpenAi.mjs";
import {azureFetch,azureBody,providerFailure} from './azureTransport.mjs';

const API_VERSION = "2024-11-30";

export async function extractDocument(bytes, mimeType, { env = process.env, fetchImpl = fetch, wait = (ms) => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const endpoint = String(env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ?? "").replace(/\/+$/, "");
  const key = String(env.AZURE_DOCUMENT_INTELLIGENCE_KEY ?? "").trim();
  if (!endpoint || !key) throw documentError(503, "azure_document_configuration_missing", "Configuration Azure Document Intelligence incomplète.");

  const started = await azureFetch(fetchImpl,`${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?_overload=analyzeDocument&api-version=${API_VERSION}`, {
    method: "POST",
    headers: { "Content-Type": mimeType, "Ocp-Apim-Subscription-Key": key },
    body: bytes,
  });
  if (!started.ok) throw providerFailure(documentError(502, "document_analysis_failed", "Azure n’a pas pu analyser ce document."),started.status);
  const operation = started.headers.get("operation-location");
  if (!operation) throw documentError(502, "document_analysis_failed", "Réponse Azure incomplète.");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (attempt) await wait(750);
    const polled = await azureFetch(fetchImpl,operation, { headers: { "Ocp-Apim-Subscription-Key": key } });
    if (!polled.ok) throw providerFailure(documentError(502, "document_analysis_failed", "Le suivi de l’analyse Azure a échoué."),polled.status);
    const payload = await azureBody(polled,'json');
    if (payload.status === "failed") throw documentError(422, "document_unreadable", "Le document est illisible ou ne contient pas assez de texte.");
    if (payload.status === "succeeded") {
      const result = payload.analyzeResult ?? {};
      const text = String(result.content ?? "").trim();
      if (text.length < 20) throw documentError(422, "document_unreadable", "Le document est illisible ou ne contient pas assez de texte.");
      return {
        text,
        paragraphs: (result.paragraphs ?? []).map(item => ({ content: item.content, role: item.role, boundingRegions: item.boundingRegions })),
        tables: (result.tables ?? []).map(table => ({ rowCount: table.rowCount, columnCount: table.columnCount, cells: table.cells })),
        pages: (result.pages ?? []).map(page => ({ pageNumber: page.pageNumber, width: page.width, height: page.height, unit: page.unit })),
      };
    }
  }
  throw providerFailure(documentError(504, "document_analysis_timeout", "L’analyse du document prend trop de temps. Réessaie."));
}

export async function createPedagogicalAnalysis(extraction, input, dependencies = {}) {
  const raw = await (dependencies.azureChat ?? azureChat)([
    { role: "system", content: `Tu es un professeur francophone. À partir uniquement du document fourni, crée une analyse pédagogique adaptée au niveau réel de l'élève. Réponds en JSON strict avec title, detectedSubject, detectedLevel, documentType, summary, concepts, explanations, keyPoints, vocabulary, sourceWarnings. Les cinq derniers champs sauf summary sont des tableaux. Signale clairement tout complément qui ne vient pas du document.` },
    { role: "user", content: `Niveau réel de l'élève : ${input.level || "non renseigné"}\nMatières choisies : ${(input.selectedSubjects ?? []).join(", ") || "non renseignées"}\nDocument extrait :\n${extraction.text.slice(0, 45_000)}` },
  ], { json: true, maxTokens: 5000 }, dependencies.env, dependencies.fetchImpl);
  const analysis = parseJson(raw);
  return {
    title: clean(analysis.title) || input.fileName,
    detectedSubject: clean(analysis.detectedSubject),
    detectedLevel: clean(analysis.detectedLevel),
    documentType: clean(analysis.documentType) || "document",
    summary: clean(analysis.summary),
    concepts: cleanArray(analysis.concepts),
    explanations: cleanArray(analysis.explanations),
    keyPoints: cleanArray(analysis.keyPoints),
    vocabulary: cleanArray(analysis.vocabulary),
    sourceWarnings: cleanArray(analysis.sourceWarnings),
    extractedText: extraction.text,
    structure: { paragraphs: extraction.paragraphs, tables: extraction.tables, pages: extraction.pages },
  };
}

function parseJson(raw) {
  const cleaned = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { throw documentError(502, "pedagogical_analysis_failed", "L’analyse pédagogique est inexploitable."); }
}
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function cleanArray(value) { return Array.isArray(value) ? value.map(item => typeof item === "string" ? item.trim() : JSON.stringify(item)).filter(Boolean).slice(0, 30) : []; }
export function documentError(statusCode, code, message) { return Object.assign(new Error(message), { statusCode, code }); }
