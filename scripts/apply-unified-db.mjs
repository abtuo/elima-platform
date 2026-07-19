import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const config = getTargetConfig();
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL est manquante.");

function databaseProjectRef(connectionString) {
  const parsed = new URL(connectionString);
  const directMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directMatch) return directMatch[1];
  const usernameMatch = decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]+)$/i);
  return usernameMatch?.[1] ?? null;
}

const dbRef = databaseProjectRef(databaseUrl);
if (!dbRef || dbRef !== config.targetRef) {
  throw new Error("Refus de sécurité : SUPABASE_DB_URL ne désigne pas le projet configuré par VITE_SUPABASE_URL.");
}

// Vérifie séparément la clé API moderne, qui ne contient pas la référence projet.
await verifyServerKey(config);

const bundlePath = path.resolve("supabase/generated/elima-unified-database.sql");
const rawBundle = await readFile(bundlePath, "utf8");
// Les commandes commençant par une barre oblique sont propres à psql.
const bundle = rawBundle.replace(/^\s*\\[^\r\n]*(?:\r?\n|$)/gm, "");
const checksum = createHash("sha256").update(bundle).digest("hex");

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  prepare: false,
  onnotice: () => {},
});

try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('elima-unified-schema'))`;
    await tx.unsafe(`
      create table if not exists public.elima_schema_migrations (
        checksum text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const existing = await tx`select 1 from public.elima_schema_migrations where checksum = ${checksum}`;
    if (existing.length) return;
    const previousBundle = await tx`select checksum, applied_at from public.elima_schema_migrations order by applied_at desc limit 1`;
    if (previousBundle.length) {
      throw new Error(
        "Le schéma unifié est déjà initialisé avec une autre version. " +
        "N’appliquez pas à nouveau le bundle complet : utilisez la commande db:migrate:<fonctionnalité> correspondante."
      );
    }
    await tx.unsafe(bundle);
    await tx`insert into public.elima_schema_migrations (checksum) values (${checksum})`;
  });
  console.log(`Schéma Elima appliqué avec succès au projet ${config.targetRef}.`);
} finally {
  await sql.end({ timeout: 5 });
}
