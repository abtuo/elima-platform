import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const student = "00000000-0000-4000-8000-000000000101";
const otherStudent = "00000000-0000-4000-8000-000000000102";

test("PostgreSQL: onboarding atomique, contrôle propriétaire et compatibilité secondaire", async (context) => {
  const db = new PGlite(); context.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.student_profiles(
      id uuid primary key references auth.users(id), school_level_id text not null default '',
      school_membership_status text not null default 'standalone', declared_school_name text,
      declared_school_city text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    create table public.student_revision_subject_preferences(
      user_id uuid not null references auth.users(id), subject_id text not null,
      created_at timestamptz not null default now(), primary key(user_id, subject_id)
    );
    insert into auth.users values ('${student}'), ('${otherStudent}');
    insert into public.student_profiles(id, school_level_id) values
      ('${student}', ''), ('${otherStudent}', 'Terminale C');
    insert into public.student_revision_subject_preferences values ('${otherStudent}', 'maths', now());
  `);
  const migration = await readFile(new URL("../../supabase/migrations/20261019120000_revision_primary_onboarding.sql", import.meta.url), "utf8");
  await db.exec(migration);

  const existing = await db.query<{ school_cycle: string; onboarding_completed_at: string }>("select school_cycle,onboarding_completed_at from student_profiles where id=$1", [otherStudent]);
  assert.equal(existing.rows[0].school_cycle, "secondary");
  assert.ok(existing.rows[0].onboarding_completed_at);

  await db.exec(`select set_config('request.jwt.claim.sub','${student}',false)`);
  await assert.rejects(db.query("select save_revision_onboarding('primary','CM1',array['maths'],false,null,null)"), /Accompagnement adulte requis/);
  await assert.rejects(db.query("select save_revision_onboarding('primary','CM1',array['sciences-technologie'],true,null,null)"), /Matière primaire indisponible/);

  await db.query("select save_revision_onboarding($1,$2,$3,$4,$5,$6)", ["primary", "CM2", ["maths", "francais"], true, "École", "Abidjan"]);
  const profile = await db.query<{ school_cycle: string; school_level_id: string; guardian_acknowledged_at: string }>("select school_cycle,school_level_id,guardian_acknowledged_at from student_profiles where id=$1", [student]);
  assert.equal(profile.rows[0].school_cycle, "primary");
  assert.equal(profile.rows[0].school_level_id, "CM2");
  assert.ok(profile.rows[0].guardian_acknowledged_at);
  const subjects = await db.query<{ subject_id: string }>("select subject_id from student_revision_subject_preferences where user_id=$1 order by subject_id", [student]);
  assert.deepEqual(subjects.rows.map((row) => row.subject_id), ["francais", "maths"]);

  const untouched = await db.query<{ school_level_id: string }>("select school_level_id from student_profiles where id=$1", [otherStudent]);
  assert.equal(untouched.rows[0].school_level_id, "Terminale C");
});

