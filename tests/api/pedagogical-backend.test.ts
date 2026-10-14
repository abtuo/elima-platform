/* eslint-disable @typescript-eslint/no-explicit-any -- dépôt mémoire volontairement générique pour tester la frontière de service */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createPedagogicalResourceService } from "../../apps/api/server/pedagogy/service.mjs";
import { canTransitionPedagogicalVersion } from "../../apps/api/server/pedagogy/lifecycle.mjs";

const mathUrl = new URL("../../packages/pedagogy/resources/mathematiques-3e-equations-premier-degre.json", import.meta.url);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

class MemoryRepository {
  resources = new Map<string, any>();
  versions = new Map<string, any>();
  reviews: any[] = [];
  publications = new Map<string, any>();
  assignments: any[] = [];
  classAuthorized = false;

  async createResource(input: any) {
    const { publicDocument: _publicDocument, privateContent: _privateContent, checksum: _checksum, schemaVersion: _schemaVersion, versionId: _versionId, ...metadata } = input;
    const resource = { ...metadata, currentVersionId: input.versionId, state: "draft", subjectId: null };
    const version = { id: input.versionId, resourceId: input.id, versionNumber: 1, parentVersionId: null, state: "draft", lockVersion: 1, publicDocument: clone(input.publicDocument), privateContent: clone(input.privateContent) };
    this.resources.set(input.id, resource); this.versions.set(input.versionId, version); return clone(resource);
  }
  async listResources(input: any) { const items = [...this.resources.values()].filter((item) => item.schoolId === input.schoolId); return { items: clone(items), total: items.length, limit: input.limit, offset: input.offset }; }
  async getResource(id: string) { return clone(this.resources.get(id) ?? null); }
  async getVersion(id: string, options: any = {}) { const item = clone(this.versions.get(id) ?? null); if (item && !options.includeSecrets) delete item.privateContent; return item; }
  async updateDraft(input: any) {
    const item = this.versions.get(input.versionId);
    if (!item || item.lockVersion !== input.expectedLockVersion || !["draft", "changes_requested"].includes(item.state)) return null;
    Object.assign(item, { publicDocument: clone(input.publicDocument), privateContent: clone(input.privateContent), lockVersion: item.lockVersion + 1, state: "draft" });
    Object.assign(this.resources.get(input.resourceId), { ...input, id: input.resourceId, currentVersionId: input.versionId, state: "draft" });
    this.reviews = this.reviews.filter((review) => review.versionId !== input.versionId);
    return clone(item);
  }
  async createVersion(input: any) { const item = { ...input, state: "draft", lockVersion: 1 }; this.versions.set(input.id, item); Object.assign(this.resources.get(input.resourceId), { currentVersionId: input.id, state: "draft" }); return clone(item); }
  async listVersions(resourceId: string) { return clone([...this.versions.values()].filter((item) => item.resourceId === resourceId)); }
  async transitionVersion(id: string, from: string, to: string) { const item = this.versions.get(id); if (!item || item.state !== from) return null; item.state = to; this.resources.get(item.resourceId).state = to; return clone(item); }
  async createReview(input: any) { this.reviews.push(clone(input)); return clone(input); }
  async hasPassingAutomaticReview(versionId: string) { return this.reviews.some((review) => review.versionId === versionId && review.reviewType === "automatic" && review.result === "passed"); }
  async listReviews(versionId: string) { return clone(this.reviews.filter((review) => review.versionId === versionId)); }
  async publishVersion(input: any) { const item = this.versions.get(input.versionId); if (item.state !== "validated") throw new Error("not validated"); item.state = "published"; const publication = { ...input, correctionsPolicy: input.correctionsPolicy }; this.publications.set(input.id, publication); return clone(publication); }
  async getPublication(id: string) { return clone(this.publications.get(id) ?? null); }
  async getAssignmentTarget(_type: string, id: string) { return ["class-a", "student-a"].includes(id) ? { id, schoolId: "school-a" } : null; }
  async getClassAuthorization() { return { classTeacher: this.classAuthorized, teacherSubjectClass: false }; }
  async getStudentAuthorization() { return { classTeacher: this.classAuthorized, teacherSubjectClass: false }; }
  async createAssignment(input: any) { this.assignments.push(input); return clone(input); }
  async archiveResource(id: string) { const item = this.resources.get(id); item.state = "archived"; return clone(item); }
}

async function fixture() {
  const bundle = JSON.parse(await readFile(mathUrl, "utf8"));
  const repository = new MemoryRepository();
  let sequence = 0;
  const service = createPedagogicalResourceService(repository, { uuid: () => `id-${++sequence}`, now: () => new Date("2026-10-10T12:00:00Z") });
  const author = { userId: "author-a", schoolId: "school-a", role: "TEACHER", membershipStatus: "active" };
  const reviewer = { userId: "reviewer-a", schoolId: "school-a", role: "TEACHER", membershipStatus: "active" };
  return { bundle, repository, service, author, reviewer };
}

test("le cycle d’état interdit les raccourcis et rend la publication terminale", () => {
  assert.equal(canTransitionPedagogicalVersion("draft", "in_review"), true);
  assert.equal(canTransitionPedagogicalVersion("draft", "published"), false);
  assert.equal(canTransitionPedagogicalVersion("published", "draft"), false);
});

test("une ressource est créée avec un brouillon et sa projection générique ne fuit aucun corrigé", async () => {
  const { bundle, service, author } = await fixture();
  const created = await service.createResource(author, { bundle });
  const result = await service.getResource(author, created.resource.id);
  const serialized = JSON.stringify(result);
  assert.equal(result.version.view.audience, "student");
  for (const field of ["privateContent", "secrets", "answerKey", "correctionMarkdown"]) assert.equal(serialized.includes(field), false, field);
  const teacher = await service.getResource(author, created.resource.id, { includePrivate: true });
  assert.equal(teacher.version.view.audience, "teacher");
  assert.ok(teacher.version.view.secrets.corrections.length > 0);
  const historicalStudent = await service.getVersion(author, created.resource.currentVersionId);
  assert.equal(historicalStudent.version.view.audience, "student");
  assert.equal(JSON.stringify(historicalStudent).includes("correctionMarkdown"), false);
  const historicalTeacher = await service.getVersion(author, created.resource.currentVersionId, { includePrivate: true });
  assert.equal(historicalTeacher.version.view.audience, "teacher");
});

test("l’isolation inter-établissements masque la ressource comme introuvable", async () => {
  const { bundle, service, author } = await fixture();
  const created = await service.createResource(author, { bundle });
  await assert.rejects(() => service.getResource({ ...author, userId: "other", schoolId: "school-b" }, created.resource.id), (error: any) => error.code === "pedagogical_resource_not_found");
});

test("les élèves et les enseignants non auteurs ne peuvent pas écrire ou lire les secrets", async () => {
  const { bundle, service, author, reviewer } = await fixture();
  await assert.rejects(() => service.createResource({ ...author, role: "STUDENT" }, { bundle }), (error: any) => error.code === "pedagogical_access_denied");
  const created = await service.createResource(author, { bundle });
  await assert.rejects(() => service.getResource(reviewer, created.resource.id, { includePrivate: true }), (error: any) => error.code === "pedagogical_edit_denied");
});

test("le verrou optimiste refuse l’écrasement d’un brouillon concurrent", async () => {
  const { bundle, service, author } = await fixture();
  const created = await service.createResource(author, { bundle });
  await service.updateDraft(author, { resourceId: created.resource.id, versionId: created.resource.currentVersionId, expectedLockVersion: 1, bundle });
  await assert.rejects(() => service.updateDraft(author, { resourceId: created.resource.id, versionId: created.resource.currentVersionId, expectedLockVersion: 1, bundle }), (error: any) => error.code === "pedagogical_version_conflict");
});

test("validation automatique, décision humaine et publication conservent la version", async () => {
  const { bundle, repository, service, author, reviewer } = await fixture();
  const created = await service.createResource(author, { bundle });
  const versionId = created.resource.currentVersionId;
  await service.submitForReview(author, versionId);
  const validation = await service.validateVersion(author, versionId);
  assert.equal(validation.validation.success, true);
  await service.decideReview(reviewer, { versionId, decision: "approve" });
  const publication = await service.publishVersion(author, { versionId, channel: "api" });
  assert.equal(repository.versions.get(versionId).state, "published");
  await assert.rejects(() => service.updateDraft(author, { resourceId: created.resource.id, versionId, expectedLockVersion: 1, bundle }), (error: any) => error.code === "immutable_pedagogical_version");
  const next = await service.createVersion(author, { resourceId: created.resource.id });
  assert.equal(next.version.versionNumber, 2);
  assert.equal(next.version.parentVersionId, versionId);
  assert.equal(repository.publications.has(publication.id), true);
});

test("une illustration sans asset reste un brouillon valide mais bloque la publication", async () => {
  const { bundle, service, author, reviewer } = await fixture();
  bundle.document.blocks.push({ id: "image.manquante", type: "image", assetId: "asset.manquant", alt: "Schéma scientifique à fournir", sourceRefIds: [] });
  const created = await service.createResource(author, { bundle }); const versionId = created.resource.currentVersionId;
  await service.submitForReview(author, versionId); const validation = await service.validateVersion(author, versionId);
  assert.equal(validation.validation.success, true);
  assert.ok(validation.validation.warnings.some((item: any) => item.code === "SCIENTIFIC_ASSET_MISSING"));
  await service.decideReview(reviewer, { versionId, decision: "approve" });
  await assert.rejects(() => service.publishVersion(author, { versionId, channel: "api" }), (error: any) => error.code === "scientific_asset_required");
});

test("un auteur ne peut pas valider humainement sa propre version", async () => {
  const { bundle, service, author } = await fixture();
  const created = await service.createResource(author, { bundle });
  await service.submitForReview(author, created.resource.currentVersionId);
  await service.validateVersion(author, created.resource.currentVersionId);
  await assert.rejects(() => service.decideReview(author, { versionId: created.resource.currentVersionId, decision: "approve" }), (error: any) => error.code === "self_review_forbidden");
});

test("une affectation de classe exige une relation enseignant-classe explicite", async () => {
  const { bundle, repository, service, author, reviewer } = await fixture();
  const created = await service.createResource(author, { bundle });
  const versionId = created.resource.currentVersionId;
  await service.submitForReview(author, versionId); await service.validateVersion(author, versionId);
  await service.decideReview(reviewer, { versionId, decision: "approve" });
  const publication = await service.publishVersion(author, { versionId, channel: "api" });
  await assert.rejects(() => service.createAssignment(author, { publicationId: publication.id, targetType: "class", targetId: "class-a" }), (error: any) => error.code === "class_assignment_denied");
  repository.classAuthorized = true;
  const assignment = await service.createAssignment(author, { publicationId: publication.id, targetType: "class", targetId: "class-a" });
  assert.equal(assignment.schoolId, "school-a");
});

test("une affectation individuelle exige aussi une relation avec la classe de l’élève", async () => {
  const { bundle, repository, service, author, reviewer } = await fixture();
  const created = await service.createResource(author, { bundle });
  const versionId = created.resource.currentVersionId;
  await service.submitForReview(author, versionId); await service.validateVersion(author, versionId);
  await service.decideReview(reviewer, { versionId, decision: "approve" });
  const publication = await service.publishVersion(author, { versionId, channel: "api" });
  await assert.rejects(() => service.createAssignment(author, { publicationId: publication.id, targetType: "student", targetId: "student-a" }), (error: any) => error.code === "class_assignment_denied");
  repository.classAuthorized = true;
  const assignment = await service.createAssignment(author, { publicationId: publication.id, targetType: "student", targetId: "student-a" });
  assert.equal(assignment.schoolId, "school-a");
});

test("l’archivage est logique et conserve les versions", async () => {
  const { bundle, repository, service, author } = await fixture();
  const created = await service.createResource(author, { bundle });
  const archived = await service.archiveResource(author, created.resource.id);
  assert.equal(archived.state, "archived");
  assert.equal(repository.versions.size, 1);
});

test("la migration sépare les secrets, active RLS et protège les versions publiées", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/20261010120000_pedagogical_authoring_backend.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.pedagogical_resource_version_secrets/);
  assert.match(sql, /pedagogical_versions_immutable/);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /grant execute[\s\S]+service_role/);
  assert.doesNotMatch(sql, /\b(drop table|truncate)\b/i);
  assert.doesNotMatch(sql, /\b(quiz_|learning_)/i);
});

test("la migration pédagogique s’exécute localement et verrouille une version publiée", async (context) => {
  const db = new PGlite(); context.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create type public.app_role as enum ('STUDENT','PARENT','TEACHER','SCHOOL_ADMIN','SUPER_ADMIN','COMPTABLE');
    create table public.schools(id uuid primary key);
    create table public.users(id uuid primary key, school_id uuid references public.schools(id), role public.app_role);
    create table public.subjects(id uuid primary key, school_id uuid references public.schools(id));
    create table public.classes(id uuid primary key, school_id uuid references public.schools(id));
    create table public.students(id uuid primary key, school_id uuid references public.schools(id));
    create table public.teachers(id uuid primary key, school_id uuid references public.schools(id), user_id uuid references public.users(id));
    create table public.class_teachers(class_id uuid references public.classes(id), teacher_id uuid references public.teachers(id), subject_id uuid references public.subjects(id));
    create table public.teacher_subject_classes(id uuid primary key, class_id uuid references public.classes(id), teacher_id uuid references public.teachers(id), subject_id uuid references public.subjects(id));
    create table public.school_memberships(id uuid primary key, school_id uuid references public.schools(id), user_id uuid references public.users(id), role public.app_role, status text, is_primary boolean);
  `);
  const sql = await readFile(new URL("../../supabase/migrations/20261010120000_pedagogical_authoring_backend.sql", import.meta.url), "utf8");
  await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  const school = "00000000-0000-4000-8000-000000000001";
  const actor = "00000000-0000-4000-8000-000000000002";
  const resource = "00000000-0000-4000-8000-000000000003";
  const version = "00000000-0000-4000-8000-000000000004";
  await db.query("insert into schools(id) values ($1)", [school]);
  await db.query("insert into users(id,school_id,role) values ($1,$2,'TEACHER')", [actor, school]);
  await db.query("insert into pedagogical_resources(id,school_id,created_by_user_id,title,resource_type,subject,level) values ($1,$2,$3,'Titre','course','Mathématiques','3e')", [resource, school, actor]);
  await db.query("insert into pedagogical_resource_versions(id,resource_id,version_number,schema_version,state,public_document,content_checksum,created_by_user_id) values ($1,$2,1,'1.0.0','published','{}',$3,$4)", [version, resource, "a".repeat(64), actor]);
  await assert.rejects(db.query("update pedagogical_resource_versions set public_document='{}' where id=$1", [version]));
});

