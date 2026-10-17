import { createHash, randomUUID } from "node:crypto";
import {
  PedagogicalResourceBundleSchema,
  projectStudentView,
  projectTeacherView,
  validatePedagogicalBundle,
} from "../../../../packages/pedagogy/src/index.ts";
import {
  PedagogicalApiError,
  assertCanAssignClass,
  assertCanEditResource,
  assertCanReview,
  assertSameTenant,
  requireStaffActor,
} from "./authorization.mjs";
import { assertPedagogicalTransition } from "./lifecycle.mjs";

const transitionError = (message) => new PedagogicalApiError(message, 409, "invalid_pedagogical_state");

function checksum(bundle) {
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex");
}

function validatedBundle(input) {
  const result = validatePedagogicalBundle(input);
  if (!result.success || !result.data) {
    throw new PedagogicalApiError("Le document pédagogique est invalide.", 422, "pedagogical_validation_failed", {
      errors: result.errors,
      warnings: result.warnings,
    });
  }
  return { bundle: PedagogicalResourceBundleSchema.parse(result.data), warnings: result.warnings };
}

function indexedMetadata(document) {
  return {
    title: document.metadata.title,
    resourceType: document.metadata.resourceType,
    subject: document.metadata.subject,
    level: document.metadata.level,
    chapter: document.metadata.chapter ?? null,
    searchMetadata: {
      language: document.metadata.language,
      countryCode: document.metadata.countryCode ?? null,
      educationSystem: document.metadata.educationSystem,
      track: document.metadata.track ?? null,
      series: document.metadata.track ?? null,
      difficulty: document.metadata.difficulty,
      competencies: document.metadata.competencies.map((item) => item.id),
    },
  };
}

export function createPedagogicalResourceService(repository, { now = () => new Date(), uuid = randomUUID } = {}) {
  async function resourceFor(actor, resourceId, edit = false) {
    requireStaffActor(actor);
    const resource = await repository.getResource(resourceId);
    if (!resource) throw new PedagogicalApiError("Ressource pédagogique introuvable.", 404, "pedagogical_resource_not_found");
    if (edit) assertCanEditResource(actor, resource); else assertSameTenant(actor, resource);
    return resource;
  }

  async function versionFor(actor, versionId, edit = false) {
    const metadata = await repository.getVersion(versionId, { includeSecrets: false });
    if (!metadata) throw new PedagogicalApiError("Version pédagogique introuvable.", 404, "pedagogical_version_not_found");
    const resource = await resourceFor(actor, metadata.resourceId, edit);
    const version = edit ? await repository.getVersion(versionId, { includeSecrets: true }) : metadata;
    if (!version) throw new PedagogicalApiError("Version pédagogique introuvable.", 404, "pedagogical_version_not_found");
    return { resource, version };
  }

  return {
    async createResource(actor, input) {
      requireStaffActor(actor);
      const { bundle, warnings } = validatedBundle(input.bundle);
      const resourceId = uuid();
      const versionId = uuid();
      const metadata = indexedMetadata(bundle.document);
      const created = await repository.createResource({
        id: resourceId,
        versionId,
        schoolId: actor.schoolId,
        createdByUserId: actor.userId,
        visibility: input.visibility ?? "private",
        ...metadata,
        schemaVersion: bundle.document.metadata.schemaVersion,
        publicDocument: bundle.document,
        privateContent: bundle.secrets,
        checksum: checksum(bundle),
        createdAt: now().toISOString(),
      });
      return { resource: created, warnings };
    },

    async listResources(actor, query = {}) {
      requireStaffActor(actor);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const offset = Math.max(0, Number(query.offset) || 0);
      return repository.listResources({ schoolId: actor.schoolId, ...query, limit, offset });
    },

    async getResource(actor, resourceId, { includePrivate = false } = {}) {
      const resource = await resourceFor(actor, resourceId, includePrivate);
      const version = resource.currentVersionId
        ? await repository.getVersion(resource.currentVersionId, { includeSecrets: true })
        : null;
      if (!version) return { resource, version: null };
      const bundle = { document: version.publicDocument, secrets: version.privateContent };
      const { privateContent: _privateContent, ...publicVersion } = version;
      return {
        resource,
        version: includePrivate
          ? { ...version, view: projectTeacherView(bundle) }
          : { ...publicVersion, view: projectStudentView(bundle) },
      };
    },

    async getVersion(actor, versionId, { includePrivate = false } = {}) {
      const { resource, version } = await versionFor(actor, versionId, includePrivate);
      const completeVersion = includePrivate
        ? version
        : await repository.getVersion(version.id, { includeSecrets: true });
      if (!completeVersion) throw new PedagogicalApiError("Version pédagogique introuvable.", 404, "pedagogical_version_not_found");
      const bundle = { document: completeVersion.publicDocument, secrets: completeVersion.privateContent };
      const { privateContent: _privateContent, ...publicVersion } = completeVersion;
      return {
        resource,
        version: includePrivate
          ? { ...completeVersion, view: projectTeacherView(bundle) }
          : { ...publicVersion, view: projectStudentView(bundle) },
      };
    },

    async updateDraft(actor, input) {
      const { resource, version } = await versionFor(actor, input.versionId, true);
      if (resource.id !== input.resourceId || resource.currentVersionId !== version.id) {
        throw new PedagogicalApiError("La version n’est plus la version de travail courante.", 409, "stale_pedagogical_version");
      }
      if (version.state !== "draft" && version.state !== "changes_requested") {
        throw new PedagogicalApiError("Seul un brouillon peut être modifié.", 409, "immutable_pedagogical_version");
      }
      const { bundle, warnings } = validatedBundle(input.bundle);
      const updated = await repository.updateDraft({
        resourceId: resource.id,
        versionId: version.id,
        expectedLockVersion: input.expectedLockVersion,
        actorUserId: actor.userId,
        ...indexedMetadata(bundle.document),
        schemaVersion: bundle.document.metadata.schemaVersion,
        publicDocument: bundle.document,
        privateContent: bundle.secrets,
        checksum: checksum(bundle),
        updatedAt: now().toISOString(),
      });
      if (!updated) throw new PedagogicalApiError("Le brouillon a été modifié entre-temps.", 409, "pedagogical_version_conflict");
      return { version: updated, warnings };
    },

    async createVersion(actor, input) {
      const resource = await resourceFor(actor, input.resourceId, true);
      const parent = resource.currentVersionId ? await repository.getVersion(resource.currentVersionId, { includeSecrets: true }) : null;
      const source = input.bundle ?? (parent ? { document: parent.publicDocument, secrets: parent.privateContent } : null);
      if (!source) throw new PedagogicalApiError("Un contenu initial est requis.", 400, "pedagogical_bundle_required");
      const { bundle, warnings } = validatedBundle(source);
      const created = await repository.createVersion({
        id: uuid(), resourceId: resource.id, parentVersionId: parent?.id ?? null,
        versionNumber: (parent?.versionNumber ?? 0) + 1, createdByUserId: actor.userId,
        schemaVersion: bundle.document.metadata.schemaVersion,
        publicDocument: bundle.document, privateContent: bundle.secrets,
        checksum: checksum(bundle), createdAt: now().toISOString(), ...indexedMetadata(bundle.document),
      });
      return { version: created, warnings };
    },

    async listVersions(actor, resourceId) {
      await resourceFor(actor, resourceId);
      return repository.listVersions(resourceId);
    },

    async submitForReview(actor, versionId) {
      const { version } = await versionFor(actor, versionId, true);
      assertPedagogicalTransition(version.state, "in_review", transitionError);
      return repository.transitionVersion(version.id, version.state, "in_review", actor.userId);
    },

    async validateVersion(actor, versionId) {
      const { version } = await versionFor(actor, versionId, true);
      if (version.state !== "in_review") throw transitionError("La version doit être en cours de vérification.");
      const result = validatePedagogicalBundle({ document: version.publicDocument, secrets: version.privateContent });
      const review = await repository.createReview({
        id: uuid(), versionId, reviewType: "automatic", validatorUserId: actor.userId,
        result: result.success ? "passed" : "failed", errors: result.errors,
        warnings: result.warnings, validatorVersion: "@elima/pedagogy@0.1.0", reviewedAt: now().toISOString(),
      });
      return { review, validation: result };
    },

    async decideReview(actor, input) {
      const { resource, version } = await versionFor(actor, input.versionId, false);
      assertCanReview(actor, resource);
      const target = input.decision === "approve" ? "validated" : "changes_requested";
      assertPedagogicalTransition(version.state, target, transitionError);
      if (target === "validated" && !(await repository.hasPassingAutomaticReview(version.id))) {
        throw new PedagogicalApiError("Une validation automatique réussie est requise.", 409, "automatic_validation_required");
      }
      const review = await repository.createReview({
        id: uuid(), versionId: version.id, reviewType: "human", validatorUserId: actor.userId,
        result: input.decision === "approve" ? "approved" : "rejected", reasons: input.reasons ?? [],
        errors: [], warnings: [], validatorVersion: null, reviewedAt: now().toISOString(),
      });
      const transitioned = await repository.transitionVersion(version.id, version.state, target, actor.userId);
      return { review, version: transitioned };
    },

    async getReviews(actor, versionId) {
      await versionFor(actor, versionId, false);
      return repository.listReviews(versionId);
    },

    async publishVersion(actor, input) {
      const { resource, version } = await versionFor(actor, input.versionId, true);
      assertPedagogicalTransition(version.state, "published", transitionError);
      const unavailableImages = version.publicDocument.blocks.filter((block) => block.type === "image" && !block.uri);
      if (unavailableImages.length) {
        throw new PedagogicalApiError("Une illustration sans asset autorisé ne peut pas être publiée.", 409, "scientific_asset_required", { blockIds: unavailableImages.map((block) => block.id) });
      }
      return repository.publishVersion({
        id: uuid(), resourceId: resource.id, versionId: version.id, channel: input.channel,
        publishedByUserId: actor.userId, correctionsPolicy: input.correctionsPolicy ?? "teacher_only",
        availableFrom: input.availableFrom ?? null, availableUntil: input.availableUntil ?? null,
        activityMode: input.activityMode ?? "training", audience: input.audience ?? "assigned",
        maxAttempts: input.maxAttempts ?? null, revealAfterAttempts: input.revealAfterAttempts ?? null,
        publishedAt: now().toISOString(),
      });
    },

    async createAssignment(actor, input) {
      if (input.targetType === "group") {
        throw new PedagogicalApiError("Les groupes ne sont pas pris en charge pour ces supports.", 422, "pedagogical_groups_unsupported");
      }
      const publication = await repository.getPublication(input.publicationId);
      if (!publication) throw new PedagogicalApiError("Publication introuvable.", 404, "pedagogical_publication_not_found");
      const resource = await resourceFor(actor, publication.resourceId, false);
      const target = await repository.getAssignmentTarget(input.targetType, input.targetId);
      if (!target || target.schoolId !== actor.schoolId) {
        throw new PedagogicalApiError("Cible d’affectation introuvable.", 404, "pedagogical_assignment_target_not_found");
      }
      if (input.targetType === "class") {
        const authorization = await repository.getClassAuthorization(actor.userId, input.targetId, resource.subjectId ?? null);
        assertCanAssignClass(actor, authorization);
      }
      if (input.targetType === "student") {
        const authorization = await repository.getStudentAuthorization(actor.userId, input.targetId, actor.schoolId, resource.subjectId ?? null);
        assertCanAssignClass(actor, authorization);
      }
      return repository.createAssignment({
        id: uuid(), publicationId: publication.id, schoolId: actor.schoolId,
        targetType: input.targetType, targetId: input.targetId, assignedByUserId: actor.userId,
        availableFrom: input.availableFrom ?? null, availableUntil: input.availableUntil ?? null,
        correctionsPolicy: input.correctionsPolicy ?? publication.correctionsPolicy,
        activityMode: input.activityMode ?? null, maxAttempts: input.maxAttempts ?? null,
        revealAfterAttempts: input.revealAfterAttempts ?? null,
      });
    },

    async listPublications(actor, query = {}) {
      requireStaffActor(actor);
      return repository.listPublications(actor.schoolId, query.resourceId ?? null);
    },

    async withdrawPublication(actor, input) {
      const publication = await repository.getPublication(input.publicationId);
      if (!publication) throw new PedagogicalApiError("Publication introuvable.", 404, "pedagogical_publication_not_found");
      await resourceFor(actor, publication.resourceId, true);
      if (publication.state === "withdrawn") return publication;
      return repository.withdrawPublication(publication.id, actor.userId, input.reason ?? null, now().toISOString());
    },

    async publicationTracking(actor, publicationId) {
      const publication = await repository.getPublication(publicationId);
      if (!publication) throw new PedagogicalApiError("Publication introuvable.", 404, "pedagogical_publication_not_found");
      await resourceFor(actor, publication.resourceId, false);
      return repository.getPublicationTracking(publicationId, actor.schoolId);
    },

    async archiveResource(actor, resourceId) {
      const resource = await resourceFor(actor, resourceId, true);
      return repository.archiveResource(resource.id, actor.userId, now().toISOString());
    },
  };
}

