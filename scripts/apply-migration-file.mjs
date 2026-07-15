import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
if (!fileArg) throw new Error("Utilisation : --file=supabase/migrations/MIGRATION.sql");
const migrationsDir = path.resolve("supabase/migrations");
const migrationPath = path.resolve(fileArg);
if (!migrationPath.startsWith(`${migrationsDir}${path.sep}`) || path.extname(migrationPath) !== ".sql") {
  throw new Error("Seuls les fichiers SQL de supabase/migrations sont autorisés.");
}

const config = getTargetConfig();
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");
const parsed = new URL(databaseUrl);
const dbRef = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]
  ?? decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i)?.[1];
if (dbRef !== config.targetRef) throw new Error("La connexion PostgreSQL ne correspond pas au projet cible.");
await verifyServerKey(config);

const contents = await readFile(migrationPath, "utf8");
const checksum = createHash("sha256").update(contents).digest("hex");
const name = path.basename(migrationPath);
const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 15, prepare: false, onnotice: () => {} });

try {
  let skipped = false;
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('elima-incremental-migrations'))`;
    await tx.unsafe(`create table if not exists public.elima_incremental_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`);
    const existing = await tx`select checksum from public.elima_incremental_migrations where name = ${name}`;
    if (existing.length) {
      if (existing[0].checksum !== checksum) throw new Error(`La migration ${name} a changé après son application.`);
      skipped = true;
      return;
    }
    await tx.unsafe(contents);
    await tx`insert into public.elima_incremental_migrations (name, checksum) values (${name}, ${checksum})`;
  });
  console.log(skipped ? `Migration déjà appliquée : ${name}` : `Migration appliquée : ${name}`);
} finally {
  await sql.end({ timeout: 5 });
}
