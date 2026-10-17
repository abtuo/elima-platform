import { randomUUID } from "node:crypto";
import { PedagogicalGenerationRequestSchema, validatePedagogicalBundle } from "../../../../../packages/pedagogy/src/index.ts";
import { PedagogicalApiError, isTenantAdmin, requireStaffActor } from "../authorization.mjs";
import { validateDisciplinaryBundle } from "./disciplinaryValidation.mjs";

const STEPS = ["plan", "content", "exercises", "corrections", "validate", "persist"];

function assertJobAccess(actor, job) {
  requireStaffActor(actor);
  if (!job || job.schoolId !== actor.schoolId || (job.createdByUserId !== actor.userId && !isTenantAdmin(actor))) {
    throw new PedagogicalApiError("Génération introuvable.", 404, "pedagogical_generation_not_found");
  }
}

function curriculumContext(request) {
  return {
    country: request.country, educationSystem: request.educationSystem, level: request.level,
    subject: request.subject, chapter: request.chapter,
    competencies: request.competencies.map((label, index) => ({ id: `competency.${index + 1}`, label })),
    objectives: request.objectives.map((label, index) => ({ id: `objective.${index + 1}`, label })),
    references: request.references.map(({ excerpt, ...reference }) => ({ ...reference, hasAuthorizedExcerpt: Boolean(excerpt) })),
    referenceExcerpts: request.references.filter((item) => item.excerpt).map((item) => ({ id: item.id, excerpt: item.excerpt })),
    status: request.references.some((item) => item.status !== "unverified") ? "provided_references" : "curriculum_to_verify",
  };
}

function assembleBundle(job) {
  const request = job.request;
  const plan = job.artifacts.plan;
  const content = job.artifacts.content?.blocks ?? [];
  const exercises = job.artifacts.exercises?.blocks ?? [];
  const documentId = `generated:${job.id}`;
  return {
    document: {
      id: documentId,
      metadata: {
        schemaVersion: "1.0.0", title: plan.title, description: plan.description,
        resourceType: request.resourceType, language: request.language, countryCode: request.countryCode,
        educationSystem: request.educationSystem, level: request.level, ...(request.track ? { track: request.track } : {}),
        subject: request.subject, chapter: request.chapter,
        objectives: request.objectives.map((label, index) => ({ id: `objective.${index + 1}`, label })),
        competencies: request.competencies.map((label, index) => ({ id: `competency.${index + 1}`, label })),
        difficulty: request.difficulty, estimatedMinutes: request.estimatedMinutes,
        ...(request.totalPoints ? { declaredTotalPoints: request.totalPoints } : {}),
        references: request.references.map(({ excerpt: _excerpt, version, ...item }) => ({ ...item, ...(version ? { locator: `Version ${version}` } : {}) })),
        validationStatus: "pending_expert_review",
        tags: ["generated-draft", `prompt:${job.promptVersion}`],
      },
      blocks: [...content, ...exercises],
    },
    secrets: { resourceId: documentId, schemaVersion: "1.0.0", corrections: job.artifacts.corrections?.corrections ?? [] },
  };
}

function applyRepairPatch(bundle, patch) {
  const blocks = new Map(patch.blocks.map((block) => [block.id, block]));
  const corrections = new Map(patch.corrections.map((item) => [item.questionId, item]));
  const knownBlocks = new Set(bundle.document.blocks.map((block) => block.id));
  const knownQuestions = new Set(bundle.document.blocks.filter((block) => block.type === "question").map((block) => block.question.id));
  for (const id of blocks.keys()) if (!knownBlocks.has(id)) throw new PedagogicalApiError("La réparation tente d’ajouter un bloc non ciblé.", 422, "invalid_generation_repair");
  for (const id of corrections.keys()) if (!knownQuestions.has(id)) throw new PedagogicalApiError("La réparation cible une question absente.", 422, "invalid_generation_repair");
  return {
    document: { ...bundle.document, blocks: bundle.document.blocks.map((block) => blocks.get(block.id) ?? block) },
    secrets: {
      ...bundle.secrets,
      corrections: [
        ...bundle.secrets.corrections.map((item) => corrections.get(item.questionId) ?? item),
        ...[...corrections.entries()].filter(([id]) => !bundle.secrets.corrections.some((item) => item.questionId === id)).map(([, item]) => item),
      ],
    },
  };
}

function validateGenerationRequirements(bundle, request) {
  const issues = [];
  const questions = bundle.document.blocks.filter((block) => block.type === "question").map((block) => block.question);
  if (questions.length !== request.exerciseCount) issues.push({ level: "business", code: "EXERCISE_COUNT_MISMATCH", path: "document.blocks", message: `${request.exerciseCount} exercice(s) demandé(s), ${questions.length} produit(s).` });
  if (request.totalPoints !== undefined) {
    const total = questions.reduce((sum, question) => sum + question.points, 0);
    if (Math.abs(total - request.totalPoints) > 1e-9) issues.push({ level: "business", code: "REQUESTED_POINTS_MISMATCH", path: "document.metadata.declaredTotalPoints", message: `Le barème produit (${total}) diffère du barème demandé (${request.totalPoints}).` });
  }
  if (request.difficultyDistribution) {
    for (const difficulty of ["easy", "intermediate", "advanced"]) {
      const actual = questions.filter((question) => question.difficulty === difficulty).length;
      if (actual !== request.difficultyDistribution[difficulty]) issues.push({ level: "business", code: "DIFFICULTY_DISTRIBUTION_MISMATCH", path: "document.blocks", message: `Répartition ${difficulty} incorrecte.` });
    }
  }
  return issues;
}

export function createPedagogicalGenerationService({ repository, aiClient, resourceService, now = () => new Date(), uuid = randomUUID, maxRepairAttempts = 2 }) {
  async function getAuthorized(actor, jobId) {
    const job = await repository.getJob(jobId);
    assertJobAccess(actor, job);
    return job;
  }

  return {
    async submit(actor, input, idempotencyKey) {
      requireStaffActor(actor);
      const parsed = PedagogicalGenerationRequestSchema.safeParse(input);
      if (!parsed.success) throw new PedagogicalApiError("Demande de génération invalide.", 400, "invalid_generation_request", { errors: parsed.error.issues });
      const request = parsed.data;
      if (request.difficultyDistribution) {
        const total = Object.values(request.difficultyDistribution).reduce((sum, value) => sum + value, 0);
        if (total !== request.exerciseCount) throw new PedagogicalApiError("La répartition des difficultés doit correspondre au nombre d’exercices.", 400, "invalid_generation_request");
      }
      const key = String(idempotencyKey ?? "").trim();
      if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(key)) throw new PedagogicalApiError("Une clé d’idempotence valide est requise.", 400, "generation_idempotency_key_required");
      const existing = await repository.findJobByIdempotency(actor.schoolId, actor.userId, key);
      if (existing) return existing;
      await repository.reserveQuota(actor.schoolId, actor.userId);
      return repository.createJob({ id: uuid(), schoolId: actor.schoolId, createdByUserId: actor.userId, request, idempotencyKey: key, promptVersion: aiClient.promptVersion, createdAt: now().toISOString() });
    },

    async status(actor, jobId, { includePrivate = false } = {}) {
      const job = await getAuthorized(actor, jobId);
      const safe = { ...job, artifacts: undefined };
      if (includePrivate && (job.status === "succeeded" || job.status === "failed")) safe.artifacts = job.artifacts;
      return safe;
    },

    async cancel(actor, jobId) {
      const job = await getAuthorized(actor, jobId);
      if (["succeeded", "cancelled"].includes(job.status)) throw new PedagogicalApiError("Cette génération ne peut plus être annulée.", 409, "generation_not_cancellable");
      return repository.cancelJob(job.id, actor.userId, now().toISOString());
    },

    async retry(actor, jobId) {
      const job = await getAuthorized(actor, jobId);
      if (job.status !== "failed" || job.attempts >= job.maxAttempts || job.error?.retryable === false) throw new PedagogicalApiError("Cette génération ne peut pas être relancée.", 409, "generation_not_retryable");
      return repository.retryJob(job.id);
    },

    async processNextStep(actor, jobId) {
      let job = await getAuthorized(actor, jobId);
      if (job.createdByUserId !== actor.userId) throw new PedagogicalApiError("Seul l’auteur peut exécuter sa génération.", 403, "generation_worker_owner_required");
      if (!["queued", "running"].includes(job.status)) throw new PedagogicalApiError("La génération n’est pas exécutable.", 409, "generation_not_runnable");
      job = await repository.claimJob(job.id, job.lockVersion);
      if (!job) throw new PedagogicalApiError("La génération est déjà traitée par un autre worker.", 409, "generation_job_conflict");
      const step = job.currentStep;
      const started = Date.now();
      try {
        let artifact;
        let telemetry = { calls: 0, promptVersion: job.promptVersion };
        const baseContext = { request: job.request, curriculum: curriculumContext(job.request), plan: job.artifacts.plan };
        if (["plan", "content", "exercises", "corrections"].includes(step)) {
          const context = step === "corrections" ? { ...baseContext, blocks: [...(job.artifacts.content?.blocks ?? []), ...(job.artifacts.exercises?.blocks ?? [])] } : baseContext;
          await repository.reserveAiCall(job.id, actor.schoolId, actor.userId);
          const generated = await aiClient.generate(step, context);
          artifact = generated.data; telemetry = generated.telemetry;
        } else if (step === "validate") {
          let bundle = assembleBundle(job);
          let result = validatePedagogicalBundle(bundle);
          let disciplinary = result.success ? validateDisciplinaryBundle(bundle) : [];
          let blocking = [...validateGenerationRequirements(bundle, job.request), ...disciplinary.filter((item) => item.level !== "pedagogical")];
          let repairAttempts = 0;
          while ((!result.success || blocking.length) && repairAttempts < maxRepairAttempts) {
            repairAttempts += 1;
            await repository.reserveAiCall(job.id, actor.schoolId, actor.userId);
            const generated = await aiClient.generate("repair", { request: job.request, bundle, errors: [...result.errors, ...blocking] });
            bundle = applyRepairPatch(bundle, generated.data);
            telemetry = { ...generated.telemetry, calls: (telemetry.calls ?? 0) + (generated.telemetry.calls ?? 1) };
            result = validatePedagogicalBundle(bundle);
            disciplinary = result.success ? validateDisciplinaryBundle(bundle) : [];
            blocking = [...validateGenerationRequirements(bundle, job.request), ...disciplinary.filter((item) => item.level !== "pedagogical")];
          }
          if (!result.success || blocking.length) throw new PedagogicalApiError("La génération reste invalide après réparation.", 422, "generation_validation_exhausted", { errors: [...result.errors, ...blocking], warnings: [...result.warnings, ...disciplinary.filter((item) => item.level === "pedagogical")] });
          artifact = { bundle, warnings: [...result.warnings, ...disciplinary], repairAttempts };
        } else if (step === "persist") {
          const persisted = await resourceService.createResource(actor, { bundle: job.artifacts.validate.bundle, visibility: "private" });
          artifact = { resourceId: persisted.resource.id, versionId: persisted.resource.currentVersionId, state: "draft" };
        }
        const nextIndex = STEPS.indexOf(step) + 1;
        return repository.completeStep(job.id, job.lockVersion, {
          step, nextStep: STEPS[nextIndex] ?? null, artifact, telemetry,
          durationMs: Date.now() - started, completedAt: now().toISOString(), succeeded: step === "persist",
        });
      } catch (error) {
        await repository.failStep(job.id, job.lockVersion, {
          step, code: String(error?.code ?? "generation_step_failed"),
          message: error?.statusCode && Number(error.statusCode) < 500 ? error.message : "L’étape de génération a échoué.",
          retryable: error?.refundableProviderFailure === true, failedAt: now().toISOString(), durationMs: Date.now() - started,
          validation: error?.details,
        });
        throw error;
      }
    },
  };
}

export { STEPS, applyRepairPatch, assembleBundle, curriculumContext, validateGenerationRequirements };

