import { randomUUID } from "node:crypto";
import { adaptResourceToLearning } from "../../../../../packages/pedagogy/src/index.ts";
import { validateAnswer } from "../../handlers/learning.mjs";
import { PedagogicalApiError } from "../authorization.mjs";

const closedLearningTypes = new Set(["choice", "multiple_choice", "boolean", "numeric", "rational"]);

function unavailable(message = "Ce support n’est pas disponible.") {
  throw new PedagogicalApiError(message, 404, "pedagogical_support_unavailable");
}

function inWindow(item, now) {
  return (!item.availableFrom || new Date(item.availableFrom) <= now)
    && (!item.availableUntil || now <= new Date(item.availableUntil));
}

export function correctionCanBeRevealed({ policy, revealAfterAttempts, attemptsCount, dueAt, now, submitted }) {
  if (policy === "never" || policy === "teacher_only") return false;
  if (policy === "after_due_date") return Boolean(dueAt && now >= new Date(dueAt));
  if (policy !== "after_submission" || !submitted) return false;
  return !revealAfterAttempts || attemptsCount >= revealAfterAttempts;
}

function evaluateQuestion(bundle, questionId, answer, points) {
  const adapted = adaptResourceToLearning(bundle);
  const draft = adapted.supported.find((item) => item.publicQuestion.externalId === questionId);
  if (!draft || !closedLearningTypes.has(draft.publicQuestion.questionType)) {
    return {
      evaluationStatus: "pending_review", isCorrect: null, scoreAwarded: null,
      publicFeedback: { message: "Réponse enregistrée. Une validation humaine est nécessaire.", validator: "human" },
    };
  }
  const validation = validateAnswer(answer, {
    expected_answer: draft.privateQuestion.expectedAnswer,
    validation_config: draft.privateQuestion.validationConfig,
  }, points);
  return {
    evaluationStatus: validation.status === "needs_justification" ? "partial" : validation.status,
    isCorrect: validation.status === "correct",
    scoreAwarded: validation.score,
    publicFeedback: {
      message: validation.message, nextAction: validation.nextAction,
      hintAvailable: validation.hintAvailable, validator: "learning_deterministic_adapter",
    },
  };
}

function correctionProjection(bundle, questionId) {
  const correction = bundle.secrets.corrections.find((item) => item.questionId === questionId);
  if (!correction) return null;
  return { questionId, hints: correction.hints, solutionSteps: correction.solutionSteps, explanationMarkdown: correction.correctionMarkdown };
}

function publicAttempt(attempt) {
  return {
    id: attempt.id, publicationId: attempt.publicationId, versionId: attempt.versionId,
    status: attempt.status, activityMode: attempt.activityMode, attemptNumber: attempt.attemptNumber,
    answeredCount: attempt.answeredCount ?? 0, questionCount: attempt.questionCount ?? 0,
    score: attempt.score ?? 0, maxScore: attempt.maxScore ?? 0,
    pendingReviewCount: attempt.pendingReviewCount ?? 0,
    startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, completedAt: attempt.completedAt,
  };
}

export function createPedagogicalRevisionService(repository, { now = () => new Date(), uuid = randomUUID } = {}) {
  async function authorizedSupports(localUserId) {
    const context = await repository.getStudentContext(localUserId);
    if (!context?.schoolId || !context?.studentId || !context?.enrollmentActive) return [];
    const candidates = await repository.listCandidateAssignments(context);
    const instant = now();
    return candidates.filter((item) => ["active", "scheduled"].includes(item.publicationState)
      && item.channel === "revision" && inWindow(item, instant));
  }

  async function support(localUserId, publicationId) {
    const found = (await authorizedSupports(localUserId)).find((item) => item.publicationId === publicationId);
    if (!found) unavailable();
    return found;
  }

  return {
    async list(localUserId) {
      const items = await authorizedSupports(localUserId);
      return { items: items.map((item) => ({
        publicationId: item.publicationId, assignmentId: item.assignmentId,
        resourceId: item.resourceId, versionId: item.versionId, title: item.title,
        subject: item.subject, level: item.level, chapter: item.chapter,
        activityMode: item.activityMode, availableFrom: item.availableFrom,
        availableUntil: item.availableUntil, maxAttempts: item.maxAttempts,
      })) };
    },

    async content(localUserId, publicationId) {
      const allowed = await support(localUserId, publicationId);
      const version = await repository.getPublicVersion(allowed.versionId);
      if (!version) unavailable();
      const attempts = await repository.listAttempts(localUserId, publicationId);
      return {
        publication: {
          publicationId: allowed.publicationId, assignmentId: allowed.assignmentId,
          resourceId: allowed.resourceId, versionId: allowed.versionId, title: allowed.title,
          subject: allowed.subject, level: allowed.level, chapter: allowed.chapter,
          activityMode: allowed.activityMode, correctionsPolicy: allowed.correctionsPolicy,
          availableFrom: allowed.availableFrom, availableUntil: allowed.availableUntil,
          maxAttempts: allowed.maxAttempts,
        },
        version: { id: allowed.versionId, versionNumber: version.versionNumber },
        // This is the canonical student projection. Secrets are never fetched for content reads.
        view: { audience: "student", document: version.publicDocument },
        attempts: attempts.map(publicAttempt),
      };
    },

    async start(localUserId, publicationId, idempotencyKey) {
      const allowed = await support(localUserId, publicationId);
      const existing = await repository.getAttemptByKey(localUserId, publicationId, idempotencyKey);
      if (existing) return publicAttempt(existing);
      const attempts = await repository.listAttempts(localUserId, publicationId);
      if (allowed.maxAttempts && attempts.length >= allowed.maxAttempts) {
        throw new PedagogicalApiError("Le nombre maximal de tentatives est atteint.", 409, "attempt_limit_reached");
      }
      const version = await repository.getPublicVersion(allowed.versionId);
      if (!version) unavailable();
      const questions = version.publicDocument.blocks.filter((block) => block.type === "question");
      const created = await repository.createAttempt({
        id: uuid(), publicationId, assignmentId: allowed.assignmentId, resourceId: allowed.resourceId,
        versionId: allowed.versionId, schoolId: allowed.schoolId, localUserId,
        externalStudentId: allowed.studentId, idempotencyKey,
        activityMode: allowed.activityMode, attemptNumber: attempts.length + 1,
        questionCount: questions.length, maxScore: questions.reduce((sum, block) => sum + Number(block.question.points || 0), 0),
      });
      return publicAttempt(created);
    },

    async answer(localUserId, input) {
      const attempt = await repository.getAttempt(input.attemptId);
      if (!attempt || attempt.localUserId !== localUserId || attempt.status !== "in_progress") unavailable("Cette tentative n’est plus modifiable.");
      const allowed = await support(localUserId, attempt.publicationId);
      if (allowed.versionId !== attempt.versionId) unavailable();
      const existing = await repository.getAnswerByKey(attempt.id, input.questionId, input.submissionKey);
      if (existing) return existing;
      const bundle = await repository.getVersionBundle(attempt.versionId);
      if (!bundle) unavailable();
      const questionBlock = bundle.document.blocks.find((block) => block.type === "question" && block.question.id === input.questionId);
      if (!questionBlock) throw new PedagogicalApiError("Question introuvable.", 404, "pedagogical_question_not_found");
      const previousCount = await repository.countQuestionAnswers(attempt.id, input.questionId);
      const evaluated = evaluateQuestion(bundle, input.questionId, input.answer, questionBlock.question.points);
      const saved = await repository.createAnswer({
        id: uuid(), attemptId: attempt.id, questionId: input.questionId, submissionKey: input.submissionKey,
        rawAnswer: input.answer, structuredAnswer: input.structuredAnswer ?? null,
        attemptsCount: previousCount + 1, maxScore: questionBlock.question.points, ...evaluated,
      });
      await repository.refreshAttemptMetrics(attempt.id);
      const reveal = correctionCanBeRevealed({
        policy: allowed.correctionsPolicy, revealAfterAttempts: allowed.revealAfterAttempts,
        attemptsCount: previousCount + 1, dueAt: allowed.availableUntil, now: now(), submitted: true,
      });
      return { ...saved, correction: reveal ? correctionProjection(bundle, input.questionId) : null };
    },

    async submit(localUserId, attemptId) {
      const attempt = await repository.getAttempt(attemptId);
      if (!attempt || attempt.localUserId !== localUserId) unavailable();
      await support(localUserId, attempt.publicationId);
      if (attempt.status !== "in_progress") return publicAttempt(attempt);
      return publicAttempt(await repository.submitAttempt(attempt.id, now().toISOString()));
    },
  };
}
