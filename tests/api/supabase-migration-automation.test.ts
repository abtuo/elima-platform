import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMigrationSafety, assertAuthorizedFindings, projectRefFromDatabaseUrl, resolveDatabaseUrl } from "../../database/scripts/lib/migration-safety.mjs";

test("les URL PostgreSQL sélectionnent explicitement le bon projet", () => {
  assert.equal(projectRefFromDatabaseUrl("postgresql://postgres.rydnrvvmwixrkmnvpajf:secret@pooler.example.net:6543/postgres"), "rydnrvvmwixrkmnvpajf");
  assert.equal(resolveDatabaseUrl("revision", { SUPABASE_DB_URL: "postgresql://postgres.rydnrvvmwixrkmnvpajf:secret@pooler.example.net:6543/postgres" }).variable, "SUPABASE_DB_URL");
  assert.throws(() => resolveDatabaseUrl("identity", { SUPABASE_DB_URL: "postgresql://postgres.rydnrvvmwixrkmnvpajf:secret@pooler.example.net:6543/postgres" }), /Accès PostgreSQL identity absent/);
});

test("les opérations destructrices restent bloquées même si elles sont déclarées autorisées", () => {
  const findings = analyzeMigrationSafety("drop table public.students;");
  assert.throws(() => assertAuthorizedFindings(findings, ["drop-table"]), /drop-table/);
});

test("une migration additive revue peut être autorisée précisément", () => {
  const findings = analyzeMigrationSafety("alter table public.student_profiles add column if not exists school_cycle text; update public.student_profiles set school_cycle='secondary' where school_cycle is null;");
  assert.deepEqual(findings.map((finding) => finding.id), ["access-exclusive-lock", "bounded-update"]);
  assert.doesNotThrow(() => assertAuthorizedFindings(findings, ["access-exclusive-lock", "bounded-update"]));
});
