import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import postgres from "postgres";
import { analyzeMigrationSafety, assertAuthorizedFindings, PROJECTS, resolveDatabaseUrl, sha256 } from "./lib/migration-safety.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const target = process.argv.find((argument) => argument.startsWith("--target="))?.split("=")[1];
const mode = process.argv.includes("--apply") ? "apply" : "status";
const expectedRef = process.argv.find((argument) => argument.startsWith("--confirm-ref="))?.split("=")[1];
const reportDirectory = resolve(repositoryRoot, "database/reports");
if (!target || !PROJECTS[target]) throw new Error("Cible obligatoire : --target=revision ou --target=identity.");
const connection = resolveDatabaseUrl(target);
if (mode === "apply" && expectedRef !== connection.project.projectRef) {
  throw new Error(`Application refusée : ajoute --confirm-ref=${connection.project.projectRef}.`);
}

const manifestPath = resolve(repositoryRoot, `database/${connection.project.manifestTarget}/migrations/manifest.json`);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.projectRef !== connection.project.projectRef) throw new Error("Le manifeste et la cible PostgreSQL divergent.");

const localMigrations = [];
const seenVersions = new Set();
for (const entry of manifest.deployable) {
  if (seenVersions.has(entry.version)) throw new Error(`Version locale dupliquée : ${entry.version}`);
  for (const dependency of entry.dependsOn ?? []) {
    if (!seenVersions.has(dependency)) throw new Error(`${entry.version} dépend de ${dependency}, absent ou mal ordonné.`);
  }
  const migrationPath = resolve(repositoryRoot, entry.source);
  const contents = await readFile(migrationPath, "utf8");
  const findings = analyzeMigrationSafety(contents);
  localMigrations.push({ ...entry, path: migrationPath, name: basename(migrationPath).replace(/^\d+_/, "").replace(/\.sql$/, ""), contents, checksum: sha256(contents), findings });
  seenVersions.add(entry.version);
}

const sql = postgres(connection.databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

const report = {
  generatedAt: new Date().toISOString(),
  target,
  projectRef: connection.project.projectRef,
  credentialVariable: connection.variable,
  mode,
  local: [],
  remote: {},
  divergences: [],
  applied: [],
  verification: {},
};

async function officialHistory(client) {
  const exists = await client.unsafe("select to_regclass('supabase_migrations.schema_migrations')::text as name");
  if (!exists[0]?.name) return [];
  return client.unsafe("select version, coalesce(name, '') as name from supabase_migrations.schema_migrations order by version");
}

async function ledgerHistory(client) {
  const exists = await client.unsafe("select to_regclass('public.elima_migration_ledger')::text as name");
  if (!exists[0]?.name) return { rows: [], security: null };
  const rows = await client.unsafe("select version, name, checksum, applied_at from public.elima_migration_ledger order by version");
  const security = (await client.unsafe("select c.relrowsecurity as rls_enabled, (has_table_privilege('anon', 'public.elima_migration_ledger', 'select') or has_table_privilege('anon', 'public.elima_migration_ledger', 'insert') or has_table_privilege('anon', 'public.elima_migration_ledger', 'update') or has_table_privilege('anon', 'public.elima_migration_ledger', 'delete')) as anon_access, (has_table_privilege('authenticated', 'public.elima_migration_ledger', 'select') or has_table_privilege('authenticated', 'public.elima_migration_ledger', 'insert') or has_table_privilege('authenticated', 'public.elima_migration_ledger', 'update') or has_table_privilege('authenticated', 'public.elima_migration_ledger', 'delete')) as authenticated_access from pg_class c where c.oid='public.elima_migration_ledger'::regclass"))[0];
  return { rows, security };
}

async function revisionSnapshot(client) {
  const relations = await client.unsafe("select to_regclass('public.student_profiles')::text as profiles, to_regclass('public.student_revision_subject_preferences')::text as preferences");
  if (!relations[0]?.profiles || !relations[0]?.preferences) throw new Error("Dépendances Révision absentes : student_profiles ou student_revision_subject_preferences.");
  const columns = await client.unsafe("select column_name, data_type from information_schema.columns where table_schema='public' and table_name='student_profiles' order by ordinal_position");
  const constraint = await client.unsafe("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.student_profiles'::regclass and conname='student_profiles_school_cycle_check'");
  const fn = await client.unsafe("select pg_get_functiondef(p.oid) as definition, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_revision_onboarding'");
  const privileges = fn.length
    ? (await client.unsafe("select has_function_privilege('public', 'public.save_revision_onboarding(text,text,text[],boolean,text,text)', 'execute') as public_execute, has_function_privilege('authenticated', 'public.save_revision_onboarding(text,text,text[],boolean,text,text)', 'execute') as authenticated_execute"))[0]
    : null;
  const counts = await client.unsafe("select (select count(*)::int from public.student_profiles) as profiles, (select count(*)::int from public.student_revision_subject_preferences) as preferences, (select count(*)::int from public.quiz_attempts) as quiz_attempts");
  const policies = await client.unsafe("select tablename, policyname, permissive, roles::text, cmd, qual, with_check from pg_policies where schemaname='public' and tablename in ('student_profiles','student_revision_subject_preferences') order by tablename, policyname");
  const existingColumns = new Set(columns.map((row) => row.column_name));
  const onboardingColumns = ["school_cycle", "onboarding_completed_at", "guardian_acknowledged_at"];
  const present = onboardingColumns.filter((column) => existingColumns.has(column));
  const cycleAudit = present.length === onboardingColumns.length
    ? (await client.unsafe(`select
        count(*) filter (where school_cycle = 'primary')::int as primary_profiles,
        count(*) filter (where school_cycle = 'secondary')::int as secondary_profiles,
        count(*) filter (where school_cycle is null)::int as cycle_unset,
        count(*) filter (where school_level_id <> '' and onboarding_completed_at is null)::int as incomplete_nonempty_levels,
        count(*) filter (where (lower(btrim(school_level_id)) ~ '^(6|5|4|3)' or lower(btrim(school_level_id)) ~ '^(seconde|2nde|prem|1|term)') and school_cycle is distinct from 'secondary')::int as recognized_secondary_mismatches
      from public.student_profiles`))[0]
    : null;
  const quizSecurityRelations = await client.unsafe("select to_regclass('public.quiz_attempt_sessions')::text as sessions, to_regprocedure('public.submit_revision_quiz_attempt(uuid,uuid,jsonb)')::text as submit_function, to_regprocedure('public.check_revision_quiz_answer(uuid,uuid,text,text)')::text as check_function");
  const quizSecurityPresent = Boolean(quizSecurityRelations[0]?.sessions && quizSecurityRelations[0]?.submit_function);
  const quizSecurity = quizSecurityPresent ? {
    attemptColumns: await client.unsafe("select column_name from information_schema.columns where table_schema='public' and table_name='quiz_attempts' and column_name in ('score_trust','server_attempt_id') order by column_name"),
    progressColumns: await client.unsafe("select column_name from information_schema.columns where table_schema='public' and table_name='user_progress' and column_name like 'verified_%' order by column_name"),
    policies: await client.unsafe("select tablename,policyname,roles::text,cmd,qual,with_check from pg_policies where schemaname='public' and tablename in ('quiz_attempt_sessions','quiz_questions','quiz_answers') order by tablename,policyname"),
    privileges: (await client.unsafe("select has_table_privilege('authenticated','public.quiz_attempt_sessions','select') as authenticated_session_select, has_table_privilege('authenticated','public.quiz_questions','select') as authenticated_question_select, has_table_privilege('authenticated','public.quiz_answers','select') as authenticated_answer_select, has_function_privilege('authenticated','public.submit_revision_quiz_attempt(uuid,uuid,jsonb)','execute') as authenticated_submit_execute, has_function_privilege('service_role','public.submit_revision_quiz_attempt(uuid,uuid,jsonb)','execute') as service_submit_execute, case when to_regprocedure('public.check_revision_quiz_answer(uuid,uuid,text,text)') is null then null else has_function_privilege('authenticated','public.check_revision_quiz_answer(uuid,uuid,text,text)','execute') end as authenticated_check_execute, case when to_regprocedure('public.check_revision_quiz_answer(uuid,uuid,text,text)') is null then null else has_function_privilege('service_role','public.check_revision_quiz_answer(uuid,uuid,text,text)','execute') end as service_check_execute, has_function_privilege('authenticated','public.record_quiz_attempt(text,text,integer,integer,integer,timestamptz)','execute') as authenticated_legacy_execute"))[0],
    functionConfig: await client.unsafe("select proname,proconfig from pg_proc where oid='public.submit_revision_quiz_attempt(uuid,uuid,jsonb)'::regprocedure or oid=to_regprocedure('public.check_revision_quiz_answer(uuid,uuid,text,text)') order by proname"),
    counts: (await client.unsafe("select (select count(*)::int from public.quiz_attempts) as attempts, (select count(*)::int from public.quiz_attempts where score_trust='legacy_client_reported') as legacy_attempts, (select count(*)::int from public.quiz_attempt_sessions) as sessions"))[0],
  } : null;
  const subscriptionRelations = await client.unsafe("select to_regclass('public.revision_subscriptions')::text as subscriptions, to_regclass('public.revision_play_purchases')::text as purchases, to_regclass('public.revision_usage')::text as usage, to_regprocedure('public.revision_entitlement(uuid,text)')::text as entitlement_function, to_regprocedure('public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz)')::text as purchase_function");
  const subscriptionSecurityPresent = Object.values(subscriptionRelations[0] ?? {}).every(Boolean);
  const subscriptionSecurity = subscriptionSecurityPresent ? {
    rls: await client.unsafe("select relname,relrowsecurity from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='public' and relname in ('revision_subscriptions','revision_play_purchases','revision_usage') order by relname"),
    tablePrivileges: (await client.unsafe("select has_table_privilege('anon','public.revision_subscriptions','select') as anon_subscription_select, has_table_privilege('authenticated','public.revision_subscriptions','select') as authenticated_subscription_select, has_table_privilege('authenticated','public.revision_play_purchases','select') as authenticated_purchase_select, has_table_privilege('authenticated','public.revision_usage','select') as authenticated_usage_select, has_table_privilege('service_role','public.revision_subscriptions','select') as service_subscription_select"))[0],
    functionPrivileges: (await client.unsafe("select has_function_privilege('authenticated','public.revision_entitlement(uuid,text)','execute') as authenticated_entitlement_execute, has_function_privilege('authenticated','public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz)','execute') as authenticated_purchase_execute, has_function_privilege('service_role','public.revision_entitlement(uuid,text)','execute') as service_entitlement_execute, has_function_privilege('service_role','public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz)','execute') as service_purchase_execute"))[0],
    functionConfig: await client.unsafe("select proname,proconfig from pg_proc where oid in ('public.revision_entitlement(uuid,text)'::regprocedure,'public.revision_apply_play_purchase(uuid,text,text,jsonb,timestamptz)'::regprocedure) order by proname"),
    counts: (await client.unsafe("select (select count(*)::int from public.revision_subscriptions) as subscriptions, (select count(*)::int from public.revision_play_purchases) as purchases"))[0],
  } : null;
  return {
    columns,
    counts: counts[0],
    policies,
    constraint: constraint[0]?.definition ?? null,
    functionDefinition: fn[0]?.definition ?? null,
    functionConfig: fn[0]?.proconfig ?? null,
    functionPrivileges: privileges,
    cycleAudit,
    quizSecurity,
    quizSecurityState: quizSecurityPresent ? "present" : "absent",
    subscriptionSecurity,
    subscriptionSecurityState: subscriptionSecurityPresent ? "present" : "absent",
    effectState: present.length === 0 && !fn.length && !constraint.length ? "absent" : present.length === onboardingColumns.length && fn.length === 1 && constraint.length === 1 ? "present" : "partial",
  };
}

function publicSnapshot(snapshot) {
  if (!snapshot) return null;
  return { columns: snapshot.columns, counts: snapshot.counts, policies: snapshot.policies, constraint: snapshot.constraint, functionPresent: Boolean(snapshot.functionDefinition), functionConfig: snapshot.functionConfig, functionPrivileges: snapshot.functionPrivileges, cycleAudit: snapshot.cycleAudit, effectState: snapshot.effectState, quizSecurity: snapshot.quizSecurity, quizSecurityState: snapshot.quizSecurityState, subscriptionSecurity: snapshot.subscriptionSecurity, subscriptionSecurityState: snapshot.subscriptionSecurityState };
}

function verifyRevisionAfter(before, after) {
  const required = new Map(after.columns.map((row) => [row.column_name, row.data_type]));
  for (const [name, type] of [["school_cycle", "text"], ["onboarding_completed_at", "timestamp with time zone"], ["guardian_acknowledged_at", "timestamp with time zone"]]) {
    if (required.get(name) !== type) throw new Error(`Vérification échouée pour student_profiles.${name}.`);
  }
  if (before.counts.profiles !== after.counts.profiles || before.counts.preferences !== after.counts.preferences) throw new Error("Le nombre de profils ou préférences a changé pendant la migration.");
  if (JSON.stringify(before.policies) !== JSON.stringify(after.policies)) throw new Error("Les politiques RLS existantes ont changé.");
  if (!/school_cycle.*primary.*secondary/i.test(after.constraint ?? "")) throw new Error("Contrainte school_cycle invalide.");
  const definition = after.functionDefinition ?? "";
  if (!/auth\.uid\(\)/i.test(definition)) throw new Error("La fonction d'onboarding n'est pas bornée à auth.uid().");
  if (!/school_membership_status\s*=\s*'standalone'/i.test(definition)) throw new Error("La fonction d'onboarding n'est pas bornée aux profils autonomes.");
  if (!definition.includes("CM1") || !definition.includes("CM2")) throw new Error("Les classes primaires sont absentes de la fonction d'onboarding.");
  if (!definition.includes("maths") || !definition.includes("francais") || !definition.includes("student_revision_subject_preferences")) throw new Error("Les restrictions de matières sont absentes de la fonction d'onboarding.");
  if (!(after.functionConfig ?? []).includes("search_path=public")) throw new Error("search_path de la fonction SECURITY DEFINER non verrouillé.");
  if (after.functionPrivileges?.public_execute || !after.functionPrivileges?.authenticated_execute) throw new Error("Permissions de la fonction d'onboarding incorrectes.");
  if (after.cycleAudit?.recognized_secondary_mismatches || after.cycleAudit?.incomplete_nonempty_levels) throw new Error("Le backfill des comptes existants est incomplet.");
  if (after.quizSecurityState !== "present") throw new Error("La sécurisation des tentatives QCM est absente.");
  const quiz = after.quizSecurity;
  if (quiz.attemptColumns.length !== 2 || quiz.progressColumns.length !== 5) throw new Error("Colonnes de confiance QCM incomplètes.");
  if (!quiz.functionConfig.length || quiz.functionConfig.some((fn) => !(fn.proconfig ?? []).includes("search_path=public"))) throw new Error("search_path des fonctions QCM non verrouillé.");
  if (quiz.policies.length !== 2 || quiz.policies.some((policy) => !/^\(?false\)?$/i.test(String(policy.qual).replace(/\s+/g, "")))) throw new Error("Une politique expose encore les questions ou corrigés QCM.");
  if (quiz.privileges.authenticated_session_select || quiz.privileges.authenticated_question_select || quiz.privileges.authenticated_answer_select || quiz.privileges.authenticated_submit_execute || quiz.privileges.authenticated_check_execute || quiz.privileges.authenticated_legacy_execute || !quiz.privileges.service_submit_execute || quiz.privileges.service_check_execute === false) throw new Error("Permissions QCM incorrectes.");
  if (before.counts.quiz_attempts !== after.counts.quiz_attempts) throw new Error("L'historique QCM a changé pendant la migration.");
  if (after.subscriptionSecurityState !== "present") throw new Error("La sécurité des abonnements Révision est absente.");
  const subscription = after.subscriptionSecurity;
  if (subscription.rls.length !== 3 || subscription.rls.some((relation) => !relation.relrowsecurity)) throw new Error("RLS des abonnements Révision incomplète.");
  if (subscription.tablePrivileges.anon_subscription_select || subscription.tablePrivileges.authenticated_subscription_select || subscription.tablePrivileges.authenticated_purchase_select || subscription.tablePrivileges.authenticated_usage_select || !subscription.tablePrivileges.service_subscription_select) throw new Error("Permissions des tables d'abonnement incorrectes.");
  if (subscription.functionPrivileges.authenticated_entitlement_execute || subscription.functionPrivileges.authenticated_purchase_execute || !subscription.functionPrivileges.service_entitlement_execute || !subscription.functionPrivileges.service_purchase_execute) throw new Error("Permissions des fonctions d'abonnement incorrectes.");
  if (subscription.functionConfig.length !== 2 || subscription.functionConfig.some((fn) => !(fn.proconfig ?? []).some((entry) => String(entry).startsWith("search_path=public")))) throw new Error("search_path des fonctions d'abonnement non verrouillé.");
}

async function writeReport() {
  await mkdir(reportDirectory, { recursive: true });
  const file = resolve(reportDirectory, `${new Date().toISOString().replace(/[:.]/g, "-")}-${target}-${mode}.json`);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
}

try {
  const identity = await sql.unsafe("select current_database() as database, current_setting('server_version') as server_version");
  const official = await officialHistory(sql);
  const ledger = await ledgerHistory(sql);
  const remoteOfficial = new Map(official.map((row) => [String(row.version), row]));
  const remoteLedger = new Map(ledger.rows.map((row) => [String(row.version), row]));
  report.remote = { serverVersion: identity[0].server_version, officialHistory: official, ledgerHistory: ledger.rows, ledgerSecurity: ledger.security };
  if (ledger.security && (!ledger.security.rls_enabled || ledger.security.anon_access || ledger.security.authenticated_access)) {
    report.divergences.push("Le registre de migrations est exposé aux rôles API.");
  }
  let revisionBefore = target === "revision" ? await revisionSnapshot(sql) : null;
  report.verification.before = publicSnapshot(revisionBefore);

  for (const migration of localMigrations) {
    const officialEntry = remoteOfficial.get(migration.version);
    const ledgerEntry = remoteLedger.get(migration.version);
    let state = officialEntry || ledgerEntry ? "applied" : "pending";
    if (ledgerEntry && ledgerEntry.checksum !== migration.checksum) {
      state = "divergent";
      report.divergences.push(`${migration.version}: checksum distant différent`);
    }
    if (target === "revision" && migration.version === "20261019120000") {
      if (revisionBefore.effectState === "partial") {
        state = "divergent";
        report.divergences.push(`${migration.version}: effets distants partiels sans état cohérent`);
      } else if (state === "pending" && revisionBefore.effectState === "present") {
        state = "divergent";
        report.divergences.push(`${migration.version}: effets présents sans historique distant`);
      } else if (state === "applied" && revisionBefore.effectState !== "present") {
        state = "divergent";
        report.divergences.push(`${migration.version}: historique présent mais effets incomplets`);
      }
    }
    report.local.push({ version: migration.version, source: migration.source, checksum: migration.checksum, backupPolicy: migration.backupPolicy ?? null, state, findings: migration.findings });
  }

  if (mode === "apply") {
    if (report.divergences.length) throw new Error(`Déploiement ${target} arrêté : ${report.divergences.join("; ")}.`);
    const pending = localMigrations.filter((migration) => report.local.find((entry) => entry.version === migration.version)?.state === "pending");
    for (const migration of pending) {
      assertAuthorizedFindings(migration.findings, migration.authorizedFindings ?? []);
      if (migration.backupPolicy !== "transactional-structural-snapshot") {
        throw new Error(`${migration.version} bloquée : stratégie de sauvegarde absente ou non vérifiée.`);
      }
    }
    if (target === "revision" && pending.some((migration) => migration.version === "20261019120000") && revisionBefore.effectState !== "absent") throw new Error("Préconditions de l'onboarding Révision non satisfaites.");

    if (pending.length) {
      await sql.begin(async (tx) => {
        await tx.unsafe("set local lock_timeout = '5s'; set local statement_timeout = '60s'; select pg_advisory_xact_lock(hashtext('elima-guarded-migrations'))");
        await tx.unsafe("create table if not exists public.elima_migration_ledger (version text primary key, name text not null, checksum text not null, target_project_ref text not null, applied_at timestamptz not null default now())");
        await tx.unsafe("alter table public.elima_migration_ledger enable row level security; revoke all on table public.elima_migration_ledger from public, anon, authenticated");
        for (const migration of pending) {
          await tx.unsafe(migration.contents);
          await tx.unsafe("insert into public.elima_migration_ledger(version,name,checksum,target_project_ref) values ($1,$2,$3,$4)", [migration.version, migration.name, migration.checksum, connection.project.projectRef]);
          const officialTable = await tx.unsafe("select to_regclass('supabase_migrations.schema_migrations')::text as name");
          if (officialTable[0]?.name) {
            await tx.unsafe("insert into supabase_migrations.schema_migrations(version,name,statements) values ($1,$2,$3::text[]) on conflict (version) do nothing", [migration.version, migration.name, [migration.contents]]);
          }
          report.applied.push(migration.version);
        }
        if (target === "revision") {
          const revisionAfter = await revisionSnapshot(tx);
          verifyRevisionAfter(revisionBefore, revisionAfter);
        }
      });
    } else if (target === "revision") {
      verifyRevisionAfter(revisionBefore, revisionBefore);
    }
    revisionBefore = target === "revision" ? await revisionSnapshot(sql) : null;
    report.verification.after = publicSnapshot(revisionBefore);
    const securedLedger = await ledgerHistory(sql);
    report.remote.ledgerHistory = securedLedger.rows;
    report.remote.ledgerSecurity = securedLedger.security;
    if (target === "revision") {
      report.verification.functionPrivileges = revisionBefore.functionPrivileges;
    }
  }
  const reportFile = await writeReport();
  console.log(JSON.stringify({ projectRef: report.projectRef, target, mode, compared: report.local, remoteOfficialHistoryCount: report.remote.officialHistory.length, remoteLedgerHistoryCount: report.remote.ledgerHistory.length, ledgerSecurity: report.remote.ledgerSecurity, divergences: report.divergences, applied: report.applied, verification: report.verification, reportFile }, null, 2));
} catch (error) {
  report.error = error instanceof Error
    ? error.message || (Array.isArray(error.errors) ? error.errors.map((entry) => entry?.message || String(entry)).join("; ") : error.name)
    : String(error);
  const reportFile = await writeReport();
  console.error(JSON.stringify({ target, projectRef: report.projectRef, error: report.error, reportFile }, null, 2));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
