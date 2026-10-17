export class PedagogicalApiError extends Error {
  constructor(message, statusCode = 400, code = "pedagogical_error", details) {
    super(message);
    this.name = "PedagogicalApiError";
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

const STAFF_ROLES = new Set(["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"]);
const ADMIN_ROLES = new Set(["SCHOOL_ADMIN", "SUPER_ADMIN"]);

export function requireStaffActor(actor) {
  if (!actor?.userId) throw new PedagogicalApiError("Connexion requise.", 401, "authentication_required");
  if (!actor.schoolId || actor.membershipStatus !== "active" || !STAFF_ROLES.has(actor.role)) {
    throw new PedagogicalApiError("Accès pédagogique interdit.", 403, "pedagogical_access_denied");
  }
  return actor;
}

export function assertSameTenant(actor, entity) {
  requireStaffActor(actor);
  if (!entity || entity.schoolId !== actor.schoolId) {
    throw new PedagogicalApiError("Ressource pédagogique introuvable.", 404, "pedagogical_resource_not_found");
  }
}

export function assertCanEditResource(actor, resource) {
  assertSameTenant(actor, resource);
  if (!ADMIN_ROLES.has(actor.role) && resource.createdByUserId !== actor.userId) {
    throw new PedagogicalApiError("Vous ne pouvez pas modifier cette ressource.", 403, "pedagogical_edit_denied");
  }
}

export function assertCanReview(actor, resource) {
  assertSameTenant(actor, resource);
  if (!ADMIN_ROLES.has(actor.role) && resource.createdByUserId === actor.userId) {
    throw new PedagogicalApiError("Une validation humaine doit être réalisée par un autre utilisateur autorisé.", 403, "self_review_forbidden");
  }
}

export function assertCanAssignClass(actor, authorization) {
  requireStaffActor(actor);
  if (ADMIN_ROLES.has(actor.role)) return;
  if (!authorization?.classTeacher && !authorization?.teacherSubjectClass) {
    throw new PedagogicalApiError("Affectation enseignant-classe requise.", 403, "class_assignment_denied");
  }
}

export function isTenantAdmin(actor) {
  return ADMIN_ROLES.has(actor?.role);
}

