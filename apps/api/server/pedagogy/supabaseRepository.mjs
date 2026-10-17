import { PedagogicalApiError } from "./authorization.mjs";

function fail(operation, error) {
  const failure = new PedagogicalApiError("Le stockage pédagogique est momentanément indisponible.", 503, "pedagogical_storage_unavailable");
  failure.safeSupabaseErrors = [{ operation, code: String(error?.code ?? "unknown"), message: "Supabase request failed." }];
  throw failure;
}

function resource(row) {
  if (!row) return null;
  return {
    id: row.id, schoolId: row.school_id, createdByUserId: row.created_by_user_id,
    title: row.title, resourceType: row.resource_type, subject: row.subject,
    subjectId: row.subject_id ?? null, level: row.level, chapter: row.chapter,
    searchMetadata: row.search_metadata, visibility: row.visibility, state: row.state,
    currentVersionId: row.current_version_id, createdAt: row.created_at,
    updatedAt: row.updated_at, archivedAt: row.archived_at,
  };
}

function version(row, privateContent) {
  if (!row) return null;
  return {
    id: row.id, resourceId: row.resource_id, versionNumber: row.version_number,
    parentVersionId: row.parent_version_id, state: row.state, schemaVersion: row.schema_version,
    publicDocument: row.public_document, ...(privateContent !== undefined ? { privateContent } : {}),
    checksum: row.content_checksum, lockVersion: row.lock_version,
    createdByUserId: row.created_by_user_id, createdAt: row.created_at,
    updatedAt: row.updated_at, publishedAt: row.published_at,
  };
}

export async function resolvePedagogicalActor(admin, userId, requestedSchoolId) {
  let query = admin.from("school_memberships").select("school_id,role,status,is_primary").eq("user_id", userId).eq("status", "active");
  if (requestedSchoolId) query = query.eq("school_id", requestedSchoolId);
  const result = await query.order("is_primary", { ascending: false }).limit(1).maybeSingle();
  if (result.error) fail("resolve_membership", result.error);
  return result.data ? {
    userId, schoolId: result.data.school_id, role: result.data.role,
    membershipStatus: result.data.status,
  } : { userId, schoolId: null, role: null, membershipStatus: null };
}

export function createSupabasePedagogyRepository(admin) {
  return {
    async createResource(input) {
      const result = await admin.rpc("create_pedagogical_resource", {
        p_resource_id: input.id, p_version_id: input.versionId, p_school_id: input.schoolId,
        p_actor_id: input.createdByUserId, p_title: input.title, p_resource_type: input.resourceType,
        p_subject: input.subject, p_level: input.level, p_chapter: input.chapter,
        p_search_metadata: input.searchMetadata, p_visibility: input.visibility,
        p_schema_version: input.schemaVersion, p_public_document: input.publicDocument,
        p_private_content: input.privateContent, p_checksum: input.checksum,
      });
      if (result.error) fail("create_resource", result.error);
      return resource(result.data);
    },

    async listResources(input) {
      let query = admin.from("pedagogical_resources")
        .select("id,school_id,created_by_user_id,title,resource_type,subject,subject_id,level,chapter,search_metadata,visibility,state,current_version_id,created_at,updated_at,archived_at", { count: "exact" })
        .eq("school_id", input.schoolId).range(input.offset, input.offset + input.limit - 1).order("updated_at", { ascending: false });
      if (input.subject) query = query.eq("subject", input.subject);
      if (input.level) query = query.eq("level", input.level);
      if (input.resourceType) query = query.eq("resource_type", input.resourceType);
      if (input.state) query = query.eq("state", input.state);
      if (input.search) query = query.ilike("title", `%${String(input.search).replace(/[%_,()]/g, "")}%`);
      const result = await query;
      if (result.error) fail("list_resources", result.error);
      const items = (result.data ?? []).map(resource);
      const authorIds = [...new Set(items.map((item) => item.createdByUserId).filter(Boolean))];
      let names = new Map();
      if (authorIds.length) {
        const authors = await admin.from("users").select("id,full_name").in("id", authorIds);
        if (authors.error) fail("list_resource_authors", authors.error);
        names = new Map((authors.data ?? []).map((row) => [row.id, row.full_name]));
      }
      return { items: items.map((item) => ({ ...item, authorName: names.get(item.createdByUserId) ?? null })), total: result.count ?? 0, limit: input.limit, offset: input.offset };
    },

    async getResource(id) {
      const result = await admin.from("pedagogical_resources").select("*").eq("id", id).maybeSingle();
      if (result.error) fail("get_resource", result.error);
      return resource(result.data);
    },

    async getVersion(id, options = {}) {
      const result = await admin.from("pedagogical_resource_versions").select("*").eq("id", id).maybeSingle();
      if (result.error) fail("get_version", result.error);
      if (!result.data) return null;
      let privateContent;
      if (options.includeSecrets) {
        const secret = await admin.from("pedagogical_resource_version_secrets").select("private_content").eq("version_id", id).maybeSingle();
        if (secret.error) fail("get_version_secrets", secret.error);
        privateContent = secret.data?.private_content;
      }
      return version(result.data, privateContent);
    },

    async updateDraft(input) {
      const result = await admin.rpc("update_pedagogical_draft", {
        p_resource_id: input.resourceId, p_version_id: input.versionId,
        p_expected_lock_version: input.expectedLockVersion, p_actor_id: input.actorUserId,
        p_title: input.title, p_resource_type: input.resourceType, p_subject: input.subject,
        p_level: input.level, p_chapter: input.chapter, p_search_metadata: input.searchMetadata,
        p_schema_version: input.schemaVersion, p_public_document: input.publicDocument,
        p_private_content: input.privateContent, p_checksum: input.checksum,
      });
      if (result.error) fail("update_draft", result.error);
      return result.data ? version(result.data) : null;
    },

    async createVersion(input) {
      const result = await admin.rpc("create_pedagogical_resource_version", {
        p_version_id: input.id, p_resource_id: input.resourceId, p_parent_version_id: input.parentVersionId,
        p_version_number: input.versionNumber, p_actor_id: input.createdByUserId,
        p_schema_version: input.schemaVersion, p_public_document: input.publicDocument,
        p_private_content: input.privateContent, p_checksum: input.checksum,
        p_title: input.title, p_resource_type: input.resourceType, p_subject: input.subject,
        p_level: input.level, p_chapter: input.chapter, p_search_metadata: input.searchMetadata,
      });
      if (result.error) fail("create_version", result.error);
      return version(result.data);
    },

    async listVersions(resourceId) {
      const result = await admin.from("pedagogical_resource_versions").select("id,resource_id,version_number,parent_version_id,state,schema_version,content_checksum,lock_version,created_by_user_id,created_at,updated_at,published_at").eq("resource_id", resourceId).order("version_number", { ascending: false });
      if (result.error) fail("list_versions", result.error);
      return (result.data ?? []).map((row) => version(row));
    },

    async transitionVersion(id, from, to, actorUserId) {
      const result = await admin.from("pedagogical_resource_versions").update({ state: to, updated_at: new Date().toISOString() }).eq("id", id).eq("state", from).select("*").maybeSingle();
      if (result.error) fail("transition_version", result.error);
      if (!result.data) throw new PedagogicalApiError("La version a changé entre-temps.", 409, "pedagogical_version_conflict");
      const resourceUpdate = await admin.from("pedagogical_resources").update({ state: to, updated_at: new Date().toISOString() }).eq("id", result.data.resource_id).eq("current_version_id", id);
      if (resourceUpdate.error) fail("transition_resource", resourceUpdate.error);
      await admin.from("pedagogical_resource_events").insert({ resource_id: result.data.resource_id, version_id: id, actor_user_id: actorUserId, event_type: `version_${to}`, event_data: {} });
      return version(result.data);
    },

    async createReview(input) {
      const row = {
        id: input.id, version_id: input.versionId, review_type: input.reviewType,
        validator_user_id: input.validatorUserId, result: input.result,
        reasons: input.reasons ?? [], errors: input.errors, warnings: input.warnings,
        validator_version: input.validatorVersion, reviewed_at: input.reviewedAt,
      };
      const result = await admin.from("pedagogical_resource_reviews").insert(row).select("*").single();
      if (result.error) fail("create_review", result.error);
      return result.data;
    },

    async hasPassingAutomaticReview(versionId) {
      const result = await admin.from("pedagogical_resource_reviews").select("id", { count: "exact", head: true }).eq("version_id", versionId).eq("review_type", "automatic").eq("result", "passed");
      if (result.error) fail("check_review", result.error);
      return (result.count ?? 0) > 0;
    },

    async listReviews(versionId) {
      const result = await admin.from("pedagogical_resource_reviews").select("*").eq("version_id", versionId).order("reviewed_at", { ascending: false });
      if (result.error) fail("list_reviews", result.error);
      return result.data ?? [];
    },

    async publishVersion(input) {
      const result = await admin.rpc("publish_pedagogical_resource_version_configured", {
        p_publication_id: input.id, p_resource_id: input.resourceId, p_version_id: input.versionId,
        p_channel: input.channel, p_actor_id: input.publishedByUserId,
        p_corrections_policy: input.correctionsPolicy, p_available_from: input.availableFrom,
        p_available_until: input.availableUntil, p_activity_mode: input.activityMode,
        p_audience: input.audience, p_max_attempts: input.maxAttempts,
        p_reveal_after_attempts: input.revealAfterAttempts,
      });
      if (result.error) fail("publish_version", result.error);
      return result.data;
    },

    async getPublication(id) {
      const result = await admin.from("pedagogical_publications").select("*").eq("id", id).maybeSingle();
      if (result.error) fail("get_publication", result.error);
      if (!result.data) return null;
      return { ...result.data, resourceId: result.data.resource_id, correctionsPolicy: result.data.corrections_policy };
    },

    async getClassAuthorization(userId, classId, subjectId) {
      const teacher = await admin.from("teachers").select("id").eq("user_id", userId).maybeSingle();
      if (teacher.error) fail("get_teacher", teacher.error);
      if (!teacher.data) return { classTeacher: false, teacherSubjectClass: false };
      let first = admin.from("class_teachers").select("class_id", { count: "exact", head: true }).eq("teacher_id", teacher.data.id).eq("class_id", classId);
      let second = admin.from("teacher_subject_classes").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.data.id).eq("class_id", classId);
      if (subjectId) { first = first.eq("subject_id", subjectId); second = second.eq("subject_id", subjectId); }
      const [a, b] = await Promise.all([first, second]);
      if (a.error || b.error) fail("get_class_authorization", a.error ?? b.error);
      return { classTeacher: (a.count ?? 0) > 0, teacherSubjectClass: (b.count ?? 0) > 0 };
    },

    async getStudentAuthorization(userId, studentId, schoolId, subjectId) {
      const enrollment = await admin.from("enrollments").select("class_id").eq("student_id", studentId).eq("school_id", schoolId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (enrollment.error) fail("get_student_enrollment", enrollment.error);
      if (!enrollment.data?.class_id) return { classTeacher: false, teacherSubjectClass: false };
      return this.getClassAuthorization(userId, enrollment.data.class_id, subjectId);
    },

    async getAssignmentTarget(targetType, targetId) {
      if (targetType === "group") return null;
      const table = targetType === "class" ? "classes" : "students";
      const result = await admin.from(table).select("id,school_id").eq("id", targetId).maybeSingle();
      if (result.error) fail("get_assignment_target", result.error);
      return result.data ? { id: result.data.id, schoolId: result.data.school_id } : null;
    },

    async createAssignment(input) {
      const result = await admin.from("pedagogical_assignments").insert({
        id: input.id, publication_id: input.publicationId, school_id: input.schoolId,
        target_type: input.targetType, target_id: input.targetId, assigned_by_user_id: input.assignedByUserId,
        available_from: input.availableFrom, available_until: input.availableUntil,
        corrections_policy: input.correctionsPolicy,
        activity_mode: input.activityMode, max_attempts: input.maxAttempts,
        reveal_after_attempts: input.revealAfterAttempts,
      }).select("*").single();
      if (result.error) fail("create_assignment", result.error);
      return result.data;
    },

    async listPublications(schoolId, resourceId) {
      let resources = admin.from("pedagogical_resources").select("id").eq("school_id", schoolId);
      if (resourceId) resources = resources.eq("id", resourceId);
      const owned = await resources;
      if (owned.error) fail("list_publication_resources", owned.error);
      const ids = (owned.data ?? []).map((row) => row.id);
      if (!ids.length) return { items: [] };
      const result = await admin.from("pedagogical_publications").select("*,pedagogical_assignments(*)").in("resource_id", ids).order("published_at", { ascending: false });
      if (result.error) fail("list_publications", result.error);
      return { items: result.data ?? [] };
    },

    async withdrawPublication(id, userId, reason, withdrawnAt) {
      const result = await admin.from("pedagogical_publications").update({
        state: "withdrawn", withdrawn_at: withdrawnAt,
        withdrawn_by_user_id: userId, withdrawal_reason: reason,
      }).eq("id", id).in("state", ["active", "scheduled"]).select("*").maybeSingle();
      if (result.error) fail("withdraw_publication", result.error);
      if (!result.data) throw new PedagogicalApiError("La publication ne peut plus être retirée.", 409, "publication_not_withdrawable");
      return result.data;
    },

    async getPublicationTracking(publicationId, schoolId) {
      const result = await admin.from("pedagogical_revision_attempts").select("id,external_student_id,status,activity_mode,attempt_number,answered_count,question_count,score,max_score,pending_review_count,started_at,submitted_at,updated_at").eq("publication_id", publicationId).eq("school_id", schoolId).order("updated_at", { ascending: false });
      if (result.error) fail("publication_tracking", result.error);
      const items = result.data ?? [];
      return {
        items,
        summary: {
          learners: new Set(items.map((item) => item.external_student_id).filter(Boolean)).size,
          started: items.length,
          submitted: items.filter((item) => item.status !== "in_progress").length,
          pendingReview: items.reduce((sum, item) => sum + Number(item.pending_review_count ?? 0), 0),
        },
      };
    },

    async archiveResource(id, actorUserId, archivedAt) {
      const result = await admin.from("pedagogical_resources").update({ state: "archived", archived_at: archivedAt, updated_at: archivedAt }).eq("id", id).neq("state", "archived").select("*").maybeSingle();
      if (result.error) fail("archive_resource", result.error);
      if (!result.data) throw new PedagogicalApiError("La ressource est déjà archivée.", 409, "resource_already_archived");
      await admin.from("pedagogical_resource_events").insert({ resource_id: id, actor_user_id: actorUserId, event_type: "resource_archived", event_data: {} });
      return resource(result.data);
    },
  };
}

