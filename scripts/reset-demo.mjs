import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import postgres from "postgres";
import {
  assertDemoTarget,
  getTargetConfig,
  verifyServerKey,
} from "./lib/supabase-target.mjs";

const DEMO_SCHOOL_NAME = "Collège Moderne Abidjan";
const yes = process.argv.includes("--yes");
const dryRun = process.argv.includes("--dry-run");
const config = getTargetConfig();
assertDemoTarget(config);
await verifyServerKey(config);

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est obligatoire.");
if (!dryRun && (!process.env.SEED_AUTH_PASSWORD || process.env.SEED_AUTH_PASSWORD.length < 12)) {
  throw new Error("SEED_AUTH_PASSWORD (12 caractères minimum) est obligatoire et doit rester hors de Git.");
}

function databaseProjectRef(connectionString) {
  const parsed = new URL(connectionString);
  return (
    parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1] ??
    decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1] ??
    null
  );
}

if (databaseProjectRef(databaseUrl) !== config.targetRef) {
  throw new Error("Refus de sécurité : SUPABASE_DB_URL ne correspond pas au projet Demo.");
}

const authHeaders = { apikey: config.serverKey };
async function authRequest(pathname, init = {}) {
  const response = await fetch(`${config.url}/auth/v1/admin${pathname}`, {
    ...init,
    headers: { ...authHeaders, ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? body.msg ?? `Auth Admin HTTP ${response.status}`);
  }
  return body;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const body = await authRequest(`/users?page=${page}&per_page=1000`);
    const rows = body.users ?? [];
    users.push(...rows);
    if (rows.length < 1000) break;
  }
  return users;
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} a échoué (${code ?? 1}).`));
    });
  });
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  prepare: false,
  onnotice: () => {},
});

let schoolIds;
try {
  schoolIds = await sql`select id from public.schools order by id`;
} finally {
  await sql.end({ timeout: 5 });
}

const schoolIdSet = new Set(schoolIds.map((row) => String(row.id)));
const authUsers = await listAuthUsers();
const demoAuthUsers = authUsers.filter((user) => {
  const schoolId = String(user.user_metadata?.school_id ?? user.app_metadata?.school_id ?? "");
  const email = String(user.email ?? "").toLowerCase();
  return (
    schoolIdSet.has(schoolId) ||
    email.endsWith("@demo.elima.invalid") ||
    email.endsWith("@seed-elima.invalid") ||
    email.endsWith("@elima.school")
  );
});

console.log(
  JSON.stringify(
    {
      target: config.targetRef,
      expectedSchool: DEMO_SCHOOL_NAME,
      existingSchoolsToRemove: schoolIds.length,
      authUsersToRemove: demoAuthUsers.length,
      dryRun,
    },
    null,
    2,
  ),
);

if (dryRun) process.exit(0);

if (!yes) {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const expected = `RESET DEMO ${config.targetRef}`;
  const answer = await readline.question(`Tapez exactement "${expected}" pour continuer : `);
  readline.close();
  if (answer !== expected) throw new Error("Confirmation incorrecte : reset annulé.");
}

const cleanupSql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  prepare: false,
  onnotice: () => {},
});
try {
  await cleanupSql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('elima-demo-reset'))`;
    await tx`update public.schools set current_term_id = null`;
    await tx`delete from public.schools`;
    await tx`delete from public.demo_requests`;
    await tx`delete from public.auth_verification_challenges`;
    await tx`delete from public.school_registration_requests`;
  });
} finally {
  await cleanupSql.end({ timeout: 5 });
}

for (const user of demoAuthUsers) {
  await authRequest(`/users/${user.id}`, { method: "DELETE" });
}

const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const seedEnv = {
  SUPABASE_URL: config.url,
  SUPABASE_SERVICE_ROLE_KEY: config.serverKey,
  ELIMA_APP_MODE: "demo",
  APP_ENV: "demo",
};
await run(process.execPath, [tsxCli, path.join("apps", "web", "scripts", "seed-demo.ts")], seedEnv);
await run(process.execPath, [path.join("scripts", "seed-demo-quiz-history.mjs")], seedEnv);

const demoSeedSql = await readFile(path.join("supabase", "seed.demo.sql"), "utf8");
const seedSql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 20,
  prepare: false,
  onnotice: () => {},
});
try {
  await seedSql.begin(async (tx) => {
    await tx`select set_config('app.settings.app_env', 'demo', true)`;
    await tx.unsafe(demoSeedSql);
  });
} finally {
  await seedSql.end({ timeout: 5 });
}

await run(process.execPath, [path.join("scripts", "verify-demo-seed.mjs")], seedEnv);

console.log(`[demo:reset] ${DEMO_SCHOOL_NAME} recréé et vérifié sur ${config.targetRef}.`);
