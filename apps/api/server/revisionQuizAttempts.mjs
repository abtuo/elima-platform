import { randomInt, randomUUID } from "node:crypto";
import { RevisionApiError } from "./revisionAiQuota.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value, max = 180) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function shuffled(values, randomIndex = (length) => randomInt(length)) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}

function publicQuestions(snapshot) {
  return snapshot.questions.map((question) => ({
    id: question.id,
    question: question.prompt,
    options: question.options.map((option) => option.text),
    optionIds: question.options.map((option) => option.id),
    hint: question.hint || undefined,
  }));
}

export function generatedQuestionSnapshot(rawQuestions, randomIndex) {
  const questions = rawQuestions.map((raw, questionIndex) => {
    const options = Array.isArray(raw.options) ? raw.options.map((text, optionIndex) => ({
      id: `generated-${questionIndex + 1}-option-${optionIndex + 1}`,
      text: clean(String(text), 1_000),
      correct: optionIndex === Number(raw.correctIndex),
    })) : [];
    if (!clean(raw.question, 4_000) || options.length !== 4 || options.filter((option) => option.correct).length !== 1) return null;
    const mixed = shuffled(options, randomIndex);
    return {
      id: `generated-${questionIndex + 1}`,
      prompt: clean(raw.question, 4_000),
      options: mixed.map(({ id, text }) => ({ id, text })),
      correctAnswerId: options.find((option) => option.correct).id,
      hint: clean(raw.hint, 2_000),
      explanation: clean(raw.explanation, 4_000),
    };
  }).filter(Boolean);
  if (!questions.length) throw new RevisionApiError("Aucune question valide.", 400, "invalid_quiz_questions");
  return { questions };
}

export async function createGeneratedQuizAttempt(admin, userId, input, rawQuestions, dependencies = {}) {
  const sessionId = (dependencies.randomUUID ?? randomUUID)();
  const snapshot = generatedQuestionSnapshot(rawQuestions, dependencies.randomIndex);
  const source = input.source === "document" ? "document" : "generated";
  const inserted = await admin.from("quiz_attempt_sessions").insert({
    id: sessionId,
    user_id: userId,
    quiz_ref: `generated:${sessionId}`,
    subject_label: clean(input.subject, 100),
    topic: clean(input.topic),
    source,
    source_document_id: UUID.test(String(input.sourceDocumentId ?? "")) ? input.sourceDocumentId : null,
    question_snapshot: snapshot,
  }).select("id").single();
  if (inserted.error || !inserted.data) throw new RevisionApiError("Impossible de préparer ce quiz.", 503, "quiz_attempt_storage_unavailable");
  return { attemptId: sessionId, quizRef: `generated:${sessionId}`, questions: publicQuestions(snapshot) };
}

export async function createCatalogQuizAttempt(admin, userId, input, dependencies = {}) {
  let quizRef = clean(input.quizRef, 200);
  if (!quizRef || quizRef === "daily") {
    const latest = await admin.from("quiz_sets").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error || !latest.data?.id) throw new RevisionApiError("Quiz indisponible.", 404, "quiz_not_found");
    quizRef = String(latest.data.id);
  }
  if (!UUID.test(quizRef)) throw new RevisionApiError("Référence de quiz invalide.", 400, "invalid_quiz_reference");

  const quiz = await admin.from("quiz_sets").select("id,subject,subject_label,topic").eq("id", quizRef).maybeSingle();
  if (quiz.error || !quiz.data) throw new RevisionApiError("Quiz introuvable.", 404, "quiz_not_found");
  const selected = await admin.from("quiz_questions")
    .select("id,prompt,hint,explanation,question_order,answers:quiz_answers(id,answer_text,is_correct,answer_order)")
    .eq("quiz_set_id", quizRef)
    .order("question_order");
  if (selected.error || !selected.data?.length) throw new RevisionApiError("Questions indisponibles.", 404, "quiz_questions_not_found");

  const snapshot = { questions: selected.data.map((row) => {
    const answers = [...(Array.isArray(row.answers) ? row.answers : [])].sort((a, b) => Number(a.answer_order) - Number(b.answer_order));
    const correct = answers.filter((answer) => answer.is_correct === true);
    if (answers.length < 2 || correct.length !== 1) throw new RevisionApiError("Quiz invalide.", 503, "invalid_catalog_quiz");
    const mixed = shuffled(answers, dependencies.randomIndex);
    return {
      id: String(row.id),
      prompt: clean(row.prompt, 4_000),
      options: mixed.map((answer) => ({ id: String(answer.id), text: clean(answer.answer_text, 1_000) })),
      correctAnswerId: String(correct[0].id),
      hint: clean(row.hint, 2_000),
      explanation: clean(row.explanation, 4_000),
    };
  }) };

  const sessionId = (dependencies.randomUUID ?? randomUUID)();
  const inserted = await admin.from("quiz_attempt_sessions").insert({
    id: sessionId,
    user_id: userId,
    quiz_ref: quizRef,
    subject_label: clean(quiz.data.subject_label || quiz.data.subject, 100),
    topic: clean(quiz.data.topic),
    source: "catalog",
    question_snapshot: snapshot,
  }).select("id").single();
  if (inserted.error || !inserted.data) throw new RevisionApiError("Impossible de préparer ce quiz.", 503, "quiz_attempt_storage_unavailable");
  return { attemptId: sessionId, quizRef, questions: publicQuestions(snapshot) };
}

export async function submitQuizAttempt(admin, userId, input) {
  const attemptId = clean(input.attemptId, 100);
  if (!UUID.test(attemptId) || !Array.isArray(input.answers)) throw new RevisionApiError("Remise invalide.", 400, "invalid_quiz_submission");
  const answers = input.answers.slice(0, 100).map((answer) => ({
    questionId: clean(answer?.questionId, 100),
    answerId: clean(answer?.answerId, 100),
  }));
  if (answers.some((answer) => !answer.questionId || !answer.answerId)) throw new RevisionApiError("Réponse invalide.", 400, "invalid_quiz_answer");
  const submitted = await admin.rpc("submit_revision_quiz_attempt", {
    p_session_id: attemptId,
    p_user_id: userId,
    p_answers: answers,
  });
  if (submitted.error || !submitted.data) {
    const missing = /not found/i.test(String(submitted.error?.message ?? ""));
    throw new RevisionApiError(missing ? "Tentative introuvable." : "Impossible d’enregistrer le résultat.", missing ? 404 : 503, missing ? "quiz_attempt_not_found" : "quiz_submission_failed");
  }
  return submitted.data;
}
