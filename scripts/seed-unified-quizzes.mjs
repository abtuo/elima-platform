import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";
import { hasAnswerLetterAnchor, sanitizeExplanationForShuffle, sanitizeHintForShuffle } from "./lib/quiz-normalization.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const strict = args.includes("--strict");
const limitValue = args.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const limit = limitValue ? Math.max(1, Number.parseInt(limitValue, 10) || 0) : 0;
const dataArg = args.find((arg) => arg.startsWith("--data-dir="))?.slice("--data-dir=".length);
const dataDir = path.resolve(dataArg || process.env.QUIZ_DATA_DIR || "C:/Users/tuoab/OneDrive/Elima/dev/quiz_generation/data");

const levelByFolder = { "6eme": "6e", "5eme": "5e", "4eme": "4e", "3eme": "3e", seconde: "Seconde", premiere: "Première", terminale: "Terminale" };
const difficultyByName = { facile: 2, moyen: 3, difficile: 4, mixte: 3 };
const answerIds = ["a", "b", "c", "d"];
const defaultHint = "Repère la méthode du chapitre et élimine les choix incohérents avec l'énoncé.";

function databaseText(value, stats) {
  const source = String(value ?? "");
  const cleaned = source.replace(/\u0000/g, "");
  if (cleaned.length !== source.length) stats.removedNullBytes += source.length - cleaned.length;
  return cleaned;
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(target);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield target;
  }
}

function levelFrom(pack, segments) {
  const folder = String(segments[0] ?? "").toLowerCase();
  if (levelByFolder[folder]) return levelByFolder[folder];
  const label = String(pack.classe ?? "").toLowerCase();
  if (label.includes("6")) return "6e";
  if (label.includes("5")) return "5e";
  if (label.includes("4")) return "4e";
  if (label.includes("3")) return "3e";
  if (label.includes("second")) return "Seconde";
  if (label.includes("premi")) return "Première";
  if (label.includes("term")) return "Terminale";
  throw new Error(`niveau inconnu: ${pack.classe ?? folder}`);
}

function trackFrom(pack, level) {
  if (!["Seconde", "Première", "Terminale"].includes(level)) return null;
  const value = String(pack.filiere ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("scientif")) return "scientifique";
  if (value.includes("litter")) return "litteraire";
  if (value.includes("tech") || value.includes("pro")) return "technologique";
  return "generale";
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function normalizePack(pack, relativePath, seenPackIds, seenQuestionIds, stats) {
  if (!pack || typeof pack !== "object") throw new Error("racine JSON invalide");
  if (!validUuid(pack.id)) throw new Error("id UUID du pack invalide");
  if (seenPackIds.has(pack.id)) throw new Error(`id de pack dupliqué: ${pack.id}`);
  if (!Array.isArray(pack.questions) || pack.questions.length !== 10) throw new Error(`10 questions attendues, reçu ${pack.questions?.length ?? 0}`);

  // Un pack mis en quarantaine ne doit pas réserver ses identifiants.
  const packQuestionIds = new Set();

  const segments = relativePath.split(/[\\/]/);
  const level = levelFrom(pack, segments);
  const difficulty = difficultyByName[String(pack.difficulte ?? "moyen").toLowerCase()] ?? 3;
  const set = {
    id: pack.id,
    cache_key: `data-pack|${pack.id}`,
    level,
    subject: databaseText(pack.matiere ?? "Général", stats).trim(),
    topic: databaseText(pack.chapitre ?? "Thème", stats).replace(/\s+/g, " ").trim(),
    subject_label: databaseText(pack.matiere ?? "Général", stats).trim(),
    level_label: databaseText(pack.classe ?? level, stats).trim(),
    school_track_id: trackFrom(pack, level),
    difficulty,
    question_count: 10,
  };

  const questions = [];
  const answers = [];
  for (let index = 0; index < pack.questions.length; index += 1) {
    const source = pack.questions[index];
    if (!source || typeof source !== "object" || !validUuid(source.id)) throw new Error(`question ${index + 1}: UUID invalide`);
    if (seenQuestionIds.has(source.id) || packQuestionIds.has(source.id)) throw new Error(`id de question dupliqué: ${source.id}`);
    packQuestionIds.add(source.id);
    const prompt = databaseText(source.question, stats).trim();
    if (!prompt) throw new Error(`question ${index + 1}: énoncé vide`);
    const choices = source.choix;
    if (!choices || typeof choices !== "object") throw new Error(`question ${index + 1}: choix manquants`);
    const optionTexts = ["A", "B", "C", "D"].map((letter) => databaseText(choices[letter], stats).trim());
    if (optionTexts.some((option) => !option)) throw new Error(`question ${index + 1}: un choix est vide`);
    if (new Set(optionTexts).size !== 4) throw new Error(`question ${index + 1}: choix dupliqués`);
    const correctLetter = String(source.bonne_reponse ?? "").trim().toUpperCase();
    if (!/^[A-D]$/.test(correctLetter)) throw new Error(`question ${index + 1}: bonne_reponse invalide`);

    const rawExplanation = databaseText(source.explication, stats);
    const explanation = sanitizeExplanationForShuffle(rawExplanation);
    if (explanation !== rawExplanation.trim()) stats.sanitizedExplanations += 1;
    if (hasAnswerLetterAnchor(explanation)) throw new Error(`question ${index + 1}: référence résiduelle à une lettre dans l'explication`);
    const rawHint = databaseText(source.hint, stats);
    const hint = sanitizeHintForShuffle(rawHint, defaultHint);
    if (hint !== rawHint.trim()) stats.sanitizedHints += 1;

    questions.push({
      id: source.id,
      quiz_set_id: pack.id,
      external_id: source.id,
      question_order: index,
      prompt,
      hint,
      explanation,
      difficulty,
    });
    optionTexts.forEach((answerText, optionIndex) => {
      answers.push({
        question_id: source.id,
        answer_id: answerIds[optionIndex],
        answer_order: optionIndex,
        answer_text: answerText,
        is_correct: optionIndex === correctLetter.charCodeAt(0) - 65,
      });
    });
  }
  seenPackIds.add(pack.id);
  for (const questionId of packQuestionIds) seenQuestionIds.add(questionId);
  return { set, questions, answers };
}

async function upsertBatches(sql, table, rows, batchSize) {
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    if (table === "quiz_sets") {
      await sql`insert into public.quiz_sets ${sql(batch)} on conflict (id) do update set
        cache_key = excluded.cache_key, level = excluded.level, subject = excluded.subject,
        topic = excluded.topic, subject_label = excluded.subject_label,
        level_label = excluded.level_label, school_track_id = excluded.school_track_id,
        difficulty = excluded.difficulty, question_count = excluded.question_count`;
    } else if (table === "quiz_questions") {
      await sql`insert into public.quiz_questions ${sql(batch)} on conflict (id) do update set
        quiz_set_id = excluded.quiz_set_id, external_id = excluded.external_id,
        question_order = excluded.question_order, prompt = excluded.prompt,
        hint = excluded.hint, explanation = excluded.explanation,
        difficulty = excluded.difficulty`;
    } else if (table === "quiz_answers") {
      await sql`insert into public.quiz_answers ${sql(batch)} on conflict (question_id, answer_id) do update set
        answer_order = excluded.answer_order, answer_text = excluded.answer_text,
        is_correct = excluded.is_correct`;
    } else {
      throw new Error(`Table d'import non autorisée : ${table}`);
    }
    if ((start / batchSize + 1) % 20 === 0 || start + batchSize >= rows.length) {
      console.log(`${table}: ${Math.min(start + batchSize, rows.length)}/${rows.length}`);
    }
  }
}

const stats = { files: 0, packs: 0, skippedPacks: 0, questions: 0, answers: 0, sanitizedExplanations: 0, sanitizedHints: 0, removedNullBytes: 0, errors: [] };
const seenPackIds = new Set();
const seenQuestionIds = new Set();
const sets = [];
const questions = [];
const answers = [];

for await (const file of walk(dataDir)) {
  if (limit && stats.files >= limit) break;
  stats.files += 1;
  const relativePath = path.relative(dataDir, file);
  try {
    const pack = JSON.parse(await readFile(file, "utf8"));
    const normalized = normalizePack(pack, relativePath, seenPackIds, seenQuestionIds, stats);
    sets.push(normalized.set);
    questions.push(...normalized.questions);
    answers.push(...normalized.answers);
    stats.packs += 1;
    stats.questions += normalized.questions.length;
    stats.answers += normalized.answers.length;
  } catch (error) {
    stats.skippedPacks += 1;
    stats.errors.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(JSON.stringify({ ...stats, errors: stats.errors.slice(0, 25), dataDir }, null, 2));
if (stats.errors.length) {
  const reportDir = path.resolve("supabase/generated");
  const reportPath = path.join(reportDir, "quiz-import-quarantine.json");
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), dataDir, errors: stats.errors }, null, 2)}\n`, "utf8");
  console.warn(`${stats.errors.length} pack(s) mis en quarantaine. Rapport : ${reportPath}`);
  if (strict) throw new Error(`${stats.errors.length} fichier(s) invalide(s). Mode strict : aucun peuplement effectué.`);
}
if (!stats.packs) throw new Error("Aucun pack valide à importer.");
if (dryRun) process.exit(0);

const config = getTargetConfig();
await verifyServerKey(config);
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const parsedDbUrl = new URL(databaseUrl);
const directRef = parsedDbUrl.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
const poolerRef = decodeURIComponent(parsedDbUrl.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
if ((directRef ?? poolerRef) !== config.targetRef) {
  throw new Error("Refus de sécurité : SUPABASE_DB_URL ne désigne pas le nouveau projet.");
}

const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('elima-quiz-catalog'))`;
    await upsertBatches(tx, "quiz_sets", sets, 500);
    await upsertBatches(tx, "quiz_questions", questions, 1000);
    await upsertBatches(tx, "quiz_answers", answers, 2000);
  });
} finally {
  await sql.end({ timeout: 5 });
}
console.log(`Peuplement quiz terminé : ${stats.packs} packs, ${stats.questions} questions, ${stats.answers} réponses.`);
