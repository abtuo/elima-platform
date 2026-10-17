import { PedagogicalApiError } from "../authorization.mjs";

function storageError(operation, error) {
  const failure = new PedagogicalApiError("Le stockage des générations est momentanément indisponible.", 503, "pedagogical_generation_storage_unavailable");
  failure.safeSupabaseErrors = [{ operation, code: String(error?.code ?? "unknown"), message: "Supabase request failed." }];
  throw failure;
}

function job(row) {
  if (!row) return null;
  return {
    id: row.id, schoolId: row.school_id, createdByUserId: row.created_by_user_id,
    request: row.request, idempotencyKey: row.idempotency_key, promptVersion: row.prompt_version,
    status: row.status, currentStep: row.current_step, artifacts: row.artifacts ?? {}, error: row.error,
    attempts: row.attempts, maxAttempts: row.max_attempts, aiCalls: row.ai_calls,
    lockVersion: Number(row.lock_version), resultResourceId: row.result_resource_id,
    resultVersionId: row.result_version_id, createdAt: row.created_at, startedAt: row.started_at,
    completedAt: row.completed_at, cancelledAt: row.cancelled_at, updatedAt: row.updated_at,
  };
}

export function createSupabaseGenerationRepository(admin) {
  return {
    async findJobByIdempotency(schoolId, userId, key) {
      const result = await admin.from("pedagogical_generation_jobs").select("*").eq("school_id", schoolId).eq("created_by_user_id", userId).eq("idempotency_key", key).maybeSingle();
      if (result.error) storageError("find_generation", result.error);
      return job(result.data);
    },
    async reserveQuota(schoolId, userId) {
      const result = await admin.rpc("reserve_pedagogical_generation_job", { p_school_id: schoolId, p_user_id: userId });
      if (result.error) storageError("reserve_generation_quota", result.error);
      if (result.data !== true) throw new PedagogicalApiError("Quota quotidien de génération pédagogique atteint.", 429, "pedagogical_generation_quota_exceeded");
    },
    async createJob(input) {
      const result = await admin.from("pedagogical_generation_jobs").insert({
        id: input.id, school_id: input.schoolId, created_by_user_id: input.createdByUserId,
        request: input.request, idempotency_key: input.idempotencyKey, prompt_version: input.promptVersion,
        created_at: input.createdAt, updated_at: input.createdAt,
      }).select("*").single();
      if (result.error) storageError("create_generation", result.error);
      return job(result.data);
    },
    async getJob(id) {
      const result = await admin.from("pedagogical_generation_jobs").select("*").eq("id", id).maybeSingle();
      if (result.error) storageError("get_generation", result.error);
      return job(result.data);
    },
    async claimJob(id, expectedLock) {
      const result = await admin.from("pedagogical_generation_jobs").update({ status: "running", started_at: new Date().toISOString(), lock_version: expectedLock + 1, updated_at: new Date().toISOString() }).eq("id", id).eq("lock_version", expectedLock).in("status", ["queued", "running"]).select("*").maybeSingle();
      if (result.error) storageError("claim_generation", result.error);
      return job(result.data);
    },
    async reserveAiCall(id, schoolId, userId) {
      const result = await admin.rpc("reserve_pedagogical_generation_call", { p_generation_id: id, p_school_id: schoolId, p_user_id: userId });
      if (result.error || result.data !== true) throw new PedagogicalApiError("Plafond d’appels IA atteint pour cette génération.", 429, "pedagogical_generation_call_quota_exceeded");
    },
    async completeStep(id, expectedLock, input) {
      const result = await admin.rpc("complete_pedagogical_generation_step", {
        p_generation_id: id, p_expected_lock: expectedLock, p_step: input.step,
        p_next_step: input.nextStep, p_artifact: input.artifact, p_telemetry: input.telemetry,
        p_duration_ms: input.durationMs, p_completed_at: input.completedAt, p_succeeded: input.succeeded,
      });
      if (result.error) storageError("complete_generation_step", result.error);
      if (!result.data) throw new PedagogicalApiError("Conflit de worker de génération.", 409, "generation_job_conflict");
      return job(result.data);
    },
    async failStep(id, expectedLock, input) {
      const result = await admin.rpc("fail_pedagogical_generation_step", {
        p_generation_id: id, p_expected_lock: expectedLock, p_step: input.step,
        p_error: { code: input.code, message: input.message, retryable: input.retryable, validation: input.validation ?? null },
        p_duration_ms: input.durationMs, p_failed_at: input.failedAt,
      });
      if (result.error) storageError("fail_generation_step", result.error);
      return job(result.data);
    },
    async cancelJob(id, _userId, cancelledAt) {
      const result = await admin.from("pedagogical_generation_jobs").update({ status: "cancelled", cancelled_at: cancelledAt, updated_at: cancelledAt }).eq("id", id).in("status", ["queued", "running", "failed"]).select("*").maybeSingle();
      if (result.error) storageError("cancel_generation", result.error);
      if (!result.data) throw new PedagogicalApiError("La génération ne peut plus être annulée.", 409, "generation_not_cancellable");
      return job(result.data);
    },
    async retryJob(id) {
      const result = await admin.from("pedagogical_generation_jobs").update({ status: "queued", error: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "failed").select("*").maybeSingle();
      if (result.error) storageError("retry_generation", result.error);
      if (!result.data) throw new PedagogicalApiError("La génération ne peut pas être relancée.", 409, "generation_not_retryable");
      return job(result.data);
    },
  };
}

