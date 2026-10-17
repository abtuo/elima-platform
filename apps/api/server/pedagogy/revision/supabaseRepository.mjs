import { PedagogicalApiError } from "../authorization.mjs";

function fail(operation, error) {
  const failure = new PedagogicalApiError("Le service des supports est momentanément indisponible.", 503, "pedagogical_delivery_unavailable");
  failure.safeSupabaseErrors = [{ operation, code: String(error?.code ?? "unknown") }];
  throw failure;
}

function mapAttempt(row) {
  if (!row) return null;
  return {
    id: row.id, publicationId: row.publication_id, assignmentId: row.assignment_id,
    resourceId: row.resource_id, versionId: row.version_id, schoolId: row.school_id,
    localUserId: row.local_user_id, externalStudentId: row.external_student_id,
    status: row.status, activityMode: row.activity_mode, attemptNumber: row.attempt_number,
    answeredCount: row.answered_count, questionCount: row.question_count,
    score: Number(row.score), maxScore: Number(row.max_score), pendingReviewCount: row.pending_review_count,
    startedAt: row.started_at, submittedAt: row.submitted_at, completedAt: row.completed_at, updatedAt: row.updated_at,
  };
}

function mapAnswer(row) {
  if (!row) return null;
  return {
    id: row.id, attemptId: row.attempt_id, questionId: row.question_id,
    evaluationStatus: row.evaluation_status, isCorrect: row.is_correct,
    scoreAwarded: row.score_awarded == null ? null : Number(row.score_awarded),
    maxScore: Number(row.max_score), attemptsCount: row.attempts_count,
    publicFeedback: row.public_feedback, submittedAt: row.submitted_at,
  };
}

export function createSupabasePedagogicalRevisionRepository(admin) {
  return {
    async getStudentContext(localUserId) {
      const link = await admin.from("identity_links").select("external_school_id,external_student_id").eq("local_user_id", localUserId).maybeSingle();
      if (link.error) fail("student_identity", link.error);
      if (!link.data?.external_student_id || !link.data?.external_school_id) return null;
      const enrollment = await admin.from("enrollments").select("class_id,status").eq("student_id", link.data.external_student_id).eq("school_id", link.data.external_school_id).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (enrollment.error) fail("student_enrollment", enrollment.error);
      return {
        localUserId, schoolId: link.data.external_school_id, studentId: link.data.external_student_id,
        classId: enrollment.data?.class_id ?? null, enrollmentActive: Boolean(enrollment.data),
      };
    },

    async listCandidateAssignments(context) {
      const assignments = await admin.from("pedagogical_assignments").select("*").eq("school_id", context.schoolId).in("target_type", ["class", "student"]);
      if (assignments.error) fail("student_assignments", assignments.error);
      const eligible = (assignments.data ?? []).filter((row) => (row.target_type === "student" && row.target_id === context.studentId)
        || (row.target_type === "class" && row.target_id === context.classId));
      if (!eligible.length) return [];
      const publicationIds = [...new Set(eligible.map((row) => row.publication_id))];
      const publications = await admin.from("pedagogical_publications").select("*").in("id", publicationIds);
      if (publications.error) fail("student_publications", publications.error);
      const publicationById = new Map((publications.data ?? []).map((row) => [row.id, row]));
      const resourceIds = [...new Set((publications.data ?? []).map((row) => row.resource_id))];
      const resources = resourceIds.length ? await admin.from("pedagogical_resources").select("id,school_id,title,subject,level,chapter").in("id", resourceIds) : { data: [], error: null };
      if (resources.error) fail("student_resources", resources.error);
      const resourceById = new Map((resources.data ?? []).map((row) => [row.id, row]));
      return eligible.flatMap((assignment) => {
        const publication = publicationById.get(assignment.publication_id);
        const resource = publication && resourceById.get(publication.resource_id);
        if (!publication || !resource || resource.school_id !== context.schoolId) return [];
        return [{
          assignmentId: assignment.id, publicationId: publication.id,
          resourceId: publication.resource_id, versionId: publication.version_id,
          schoolId: resource.school_id, studentId: context.studentId,
          title: resource.title, subject: resource.subject, level: resource.level, chapter: resource.chapter,
          publicationState: publication.state, channel: publication.channel,
          activityMode: assignment.activity_mode ?? publication.activity_mode ?? "training",
          maxAttempts: assignment.max_attempts ?? publication.max_attempts,
          revealAfterAttempts: assignment.reveal_after_attempts ?? publication.reveal_after_attempts,
          correctionsPolicy: assignment.corrections_policy ?? publication.corrections_policy,
          availableFrom: assignment.available_from ?? publication.available_from,
          availableUntil: assignment.available_until ?? publication.available_until,
        }];
      });
    },

    async getPublicVersion(versionId) {
      const result = await admin.from("pedagogical_resource_versions").select("id,version_number,public_document").eq("id", versionId).maybeSingle();
      if (result.error) fail("public_version", result.error);
      return result.data ? { id: result.data.id, versionNumber: result.data.version_number, publicDocument: result.data.public_document } : null;
    },

    async getVersionBundle(versionId) {
      const [version, secret] = await Promise.all([
        admin.from("pedagogical_resource_versions").select("public_document").eq("id", versionId).maybeSingle(),
        admin.from("pedagogical_resource_version_secrets").select("private_content").eq("version_id", versionId).maybeSingle(),
      ]);
      if (version.error || secret.error) fail("version_bundle", version.error ?? secret.error);
      return version.data && secret.data ? { document: version.data.public_document, secrets: secret.data.private_content } : null;
    },

    async listAttempts(localUserId, publicationId) {
      const result = await admin.from("pedagogical_revision_attempts").select("*").eq("local_user_id", localUserId).eq("publication_id", publicationId).order("attempt_number");
      if (result.error) fail("list_attempts", result.error);
      return (result.data ?? []).map(mapAttempt);
    },

    async getAttempt(id) {
      const result = await admin.from("pedagogical_revision_attempts").select("*").eq("id", id).maybeSingle();
      if (result.error) fail("get_attempt", result.error);
      return mapAttempt(result.data);
    },

    async getAttemptByKey(localUserId, publicationId, key) {
      const result = await admin.from("pedagogical_revision_attempts").select("*").eq("local_user_id", localUserId).eq("publication_id", publicationId).eq("idempotency_key", key).maybeSingle();
      if (result.error) fail("attempt_idempotency", result.error);
      return mapAttempt(result.data);
    },

    async createAttempt(input) {
      const result = await admin.from("pedagogical_revision_attempts").insert({
        id: input.id, publication_id: input.publicationId, assignment_id: input.assignmentId,
        resource_id: input.resourceId, version_id: input.versionId, school_id: input.schoolId,
        local_user_id: input.localUserId, external_student_id: input.externalStudentId,
        idempotency_key: input.idempotencyKey, activity_mode: input.activityMode,
        attempt_number: input.attemptNumber, question_count: input.questionCount, max_score: input.maxScore,
      }).select("*").single();
      if (result.error) fail("create_attempt", result.error);
      return mapAttempt(result.data);
    },

    async getAnswerByKey(attemptId, questionId, key) {
      const result = await admin.from("pedagogical_revision_answers").select("*").eq("attempt_id", attemptId).eq("question_id", questionId).eq("submission_key", key).maybeSingle();
      if (result.error) fail("answer_idempotency", result.error);
      return mapAnswer(result.data);
    },

    async countQuestionAnswers(attemptId, questionId) {
      const result = await admin.from("pedagogical_revision_answers").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId).eq("question_id", questionId);
      if (result.error) fail("count_answers", result.error);
      return result.count ?? 0;
    },

    async createAnswer(input) {
      const result = await admin.from("pedagogical_revision_answers").insert({
        id: input.id, attempt_id: input.attemptId, question_id: input.questionId,
        submission_key: input.submissionKey, raw_answer: input.rawAnswer,
        structured_answer: input.structuredAnswer, evaluation_status: input.evaluationStatus,
        is_correct: input.isCorrect, score_awarded: input.scoreAwarded, max_score: input.maxScore,
        attempts_count: input.attemptsCount, public_feedback: input.publicFeedback,
      }).select("*").single();
      if (result.error) fail("create_answer", result.error);
      return mapAnswer(result.data);
    },

    async refreshAttemptMetrics(attemptId) {
      const result = await admin.from("pedagogical_revision_answers").select("question_id,score_awarded,evaluation_status,submitted_at").eq("attempt_id", attemptId).order("submitted_at", { ascending: false });
      if (result.error) fail("answer_metrics", result.error);
      const latest = new Map();
      for (const answer of result.data ?? []) if (!latest.has(answer.question_id)) latest.set(answer.question_id, answer);
      const values = [...latest.values()];
      const update = await admin.from("pedagogical_revision_attempts").update({
        answered_count: values.length,
        score: values.reduce((sum, item) => sum + Number(item.score_awarded ?? 0), 0),
        pending_review_count: values.filter((item) => item.evaluation_status === "pending_review").length,
        updated_at: new Date().toISOString(),
      }).eq("id", attemptId);
      if (update.error) fail("refresh_attempt", update.error);
    },

    async submitAttempt(id, submittedAt) {
      const result = await admin.from("pedagogical_revision_attempts").update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt }).eq("id", id).eq("status", "in_progress").select("*").maybeSingle();
      if (result.error) fail("submit_attempt", result.error);
      return mapAttempt(result.data);
    },
  };
}
