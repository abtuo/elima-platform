import { handleRevisionCors } from "../server/revisionCors.mjs";
import { azureChat } from "../server/azureOpenAi.mjs";
import { authorizeRevisionRequest, consumeRevisionAiQuota } from "../server/revisionAiQuota.mjs";

const DEFAULT_HINT = "Repère l’idée clé du cours et élimine les propositions incompatibles avant de calculer.";
const DEFAULT_EXPLANATION = "Reprends l’énoncé étape par étape et applique la règle du chapitre.";

export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Méthode non autorisée." });
  }

  try {
    const authorized = await authorizeRevisionRequest(request);
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body ?? {};
    const kind = body.kind === "sheet" ? "sheet" : "quiz";
    const subject = cleanInput(body.subject, 100);
    const topic = cleanInput(body.topic, 180);
    const level = cleanInput(body.level, 80) || "Collège / lycée";
    const source = body.source === "document" ? "document" : "topic";
    const sourceContext = source === "document" ? cleanInput(body.sourceContext, 45_000) : "";

    if (!subject || !topic) return response.status(400).json({ error: "La matière et le sujet sont obligatoires." });
    await consumeRevisionAiQuota(authorized.admin, authorized.user.id, {
      action: "revision_generate",
      windowSeconds: 15 * 60,
      windowLimit: 12,
      dailyLimit: 60,
    });

    if (kind === "sheet") {
      const content = await generateSheet({ subject, topic, level });
      return response.status(200).json({ kind, subject, topic, level, content });
    }

    const questions = await generateQuiz({ subject, topic, level, source, sourceContext });
    return response.status(200).json({ kind, subject, topic, level, source, questions });
  } catch (error) {
    const status = error?.statusCode ?? 500;
    const message = error?.statusCode && error instanceof Error ? error.message : "La génération est momentanément indisponible.";
    if (error?.retryAfter) response.setHeader("Retry-After", String(error.retryAfter));
    return response.status(status).json({ code: error?.code ?? "revision_generation_error", error: message, message });
  }
}

async function generateQuiz(input) {
  const count = 10;
  const documentInstructions = input.source === "document" ? `
Le document sert uniquement à identifier les notions, méthodes et difficultés à travailler.
Crée des questions entièrement nouvelles sur les mêmes notions et problématiques pédagogiques.
Ne copie, ne reformule et ne complète aucune question ou aucun exercice présent dans le document.
Utilise de nouveaux contextes, exemples, données et formulations afin d'évaluer la compréhension et le transfert.
Ne demande jamais à l'élève de se souvenir du texte ou de la formulation du document.
Reste strictement dans le périmètre des notions réellement identifiées dans l'analyse fournie.` : "";
  const system = `Tu es un professeur expert du système éducatif francophone. Génère un QCM adapté au niveau indiqué.${documentInstructions}
Réponds uniquement avec un objet JSON valide ayant une clé "questions" contenant exactement ${count} objets.
Chaque objet contient : "question", "options" (exactement 4 textes), "correctIndex" (entier de 0 à 3), "hint" et "explanation".
Une seule option est correcte. L’indice aide sans donner la réponse.
N’écris jamais "la réponse est A/B/C/D", "option A/B/C/D" ou une référence à la position d’une réponse dans l’indice ou l’explication, car les options seront mélangées.
Utilise du Markdown léger. Pour les mathématiques, écris les formules avec $...$ ou $$...$$ et du LaTeX standard.
Ne mets pas de bloc markdown autour du JSON.`;
  const raw = await azureChat([
    { role: "system", content: system },
    { role: "user", content: `Niveau : ${input.level}\nMatière : ${input.subject}\nSujet : ${input.topic}${input.source === "document" ? `\nAnalyse pédagogique du document — utilise-la pour créer des exercices inédits :\n${input.sourceContext}` : ""}` },
  ], { json: true, maxTokens: 7000 });
  const parsed = parseJsonLenient(raw);
  const list = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(list) || list.length === 0) throw new Error("Le modèle n’a produit aucune question exploitable.");

  const questions = list.map(normalizeQuestion).filter(Boolean).slice(0, count);
  if (questions.length < 5) throw new Error("Le modèle n’a pas produit assez de questions valides. Réessaie.");
  return questions.map((question, index) => ({ id: `generated-${index + 1}`, ...question }));
}

async function generateSheet(input) {
  const system = `Tu es un professeur expert du système éducatif francophone. Rédige une fiche de révision fiable, claire et adaptée au niveau indiqué.
Réponds uniquement avec le contenu Markdown de la fiche, sans préambule ni bloc de code.
Structure attendue : ## À retenir, ## Définitions ou formules, ## Méthode, ## Pièges fréquents, ## Auto-évaluation.
Ajoute des exemples courts. Pour les mathématiques et sciences, utilise $...$ ou $$...$$ avec du LaTeX standard.`;
  return azureChat([
    { role: "system", content: system },
    { role: "user", content: `Niveau : ${input.level}\nMatière : ${input.subject}\nSujet : ${input.topic}` },
  ], { maxTokens: 4500 });
}

function normalizeQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const question = cleanText(raw.question ?? raw.prompt);
  const sourceOptions = Array.isArray(raw.options)
    ? raw.options
    : raw.choix && typeof raw.choix === "object"
      ? [raw.choix.A, raw.choix.B, raw.choix.C, raw.choix.D]
      : [];
  const options = sourceOptions.map(cleanText).filter(Boolean).slice(0, 4);
  if (!question || options.length !== 4 || new Set(options).size !== 4) return null;

  let correctIndex = Number(raw.correctIndex ?? raw.correct_index);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    const correct = cleanText(raw.correct_answer ?? raw.bonne_reponse);
    if (/^[A-D]$/i.test(correct)) correctIndex = correct.toUpperCase().charCodeAt(0) - 65;
    else correctIndex = options.findIndex((option) => option.toLocaleLowerCase("fr") === correct.toLocaleLowerCase("fr"));
  }
  if (correctIndex < 0 || correctIndex > 3) return null;

  return {
    question,
    options,
    correctIndex,
    hint: removePositionReferences(cleanText(raw.hint ?? raw.indice) || DEFAULT_HINT),
    explanation: removePositionReferences(cleanText(raw.explanation ?? raw.explication) || DEFAULT_EXPLANATION),
  };
}

function removePositionReferences(value) {
  return value
    .replace(/\b(?:la\s+)?(?:bonne\s+)?r[ée]ponse\s+(?:est\s+)?(?:l['’]?)?[A-D]\b[.:]?/gi, "La bonne réponse correspond au résultat obtenu.")
    .replace(/\boption\s+[A-D]\b/gi, "cette proposition");
}

function parseJsonLenient(raw) {
  const cleaned = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\{[\s\S]*\}/) ?? cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("La réponse IA n’est pas un JSON valide.");
    return JSON.parse(match[0]);
  }
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function cleanInput(value, maxLength) {
  return cleanText(value).replace(/[<>]/g, "").slice(0, maxLength);
}
