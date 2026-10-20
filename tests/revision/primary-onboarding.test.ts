import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compatibleSubjectIds, gradesForCycle, subjectsForEducation } from "../../packages/revision-core/src/index.ts";

test("CM1 et CM2 proposent uniquement les matières primaires activées", () => {
  assert.deepEqual(gradesForCycle("primary").map((grade) => grade.id), ["CM1", "CM2"]);
  for (const level of ["CM1", "CM2"]) {
    const subjects = subjectsForEducation("primary", level);
    assert.deepEqual(subjects.filter((subject) => subject.availability === "available").map((subject) => subject.id), ["maths", "francais"]);
    assert.equal(subjects.find((subject) => subject.id === "sciences-technologie")?.availability, "planned");
  }
});

test("un changement de cycle élimine les choix incompatibles sans toucher aux historiques", async () => {
  assert.deepEqual(compatibleSubjectIds("primary", "CM2", ["maths", "svt", "francais"]), ["maths", "francais"]);
  const profile = await readFile(new URL("../../apps/revision/src/RevisionStudentProfilePage.tsx", import.meta.url), "utf8");
  assert.match(profile, /Tes historiques sont conservés/);
  assert.doesNotMatch(profile, /delete\(\).*quiz_attempts|delete\(\).*learning_attempts/);
});

test("le parcours conserve les choix au retour et bloque la matière planifiée", async () => {
  const source = await readFile(new URL("../../apps/revision/src/features/auth/RegistrationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /previousOnboardingStep/);
  assert.match(source, /disabled=\{planned\}/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /parent ou responsable légal/);
  assert.match(source, /Commencer mes révisions/);
});

test("la migration est additive, atomique et bornée à l'utilisateur authentifié", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/20261019120000_revision_primary_onboarding.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists school_cycle/);
  assert.match(migration, /create or replace function public\.save_revision_onboarding/);
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /where id = actor_id and school_membership_status = 'standalone'/);
  assert.match(migration, /student_revision_subject_preferences/);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.(quiz_attempts|learning_attempts|user_course_summaries)/i);
});
