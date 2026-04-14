/*
  Reset all classes and related data across all schools.

  ⚠️ WARNING: This is destructive and should only be used on a development/staging environment.

  Usage:
    # 1) Create env file
    cp scripts/.env.reseed.example scripts/.env.reseed
    # 2) Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    # 3) Dry run
    npx tsx scripts/reset-classes.ts --dry-run
    # 4) Apply
    npx tsx scripts/reset-classes.ts --apply
*/

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]) {
  const flags = new Set(argv.slice(2));
  return {
    dryRun: flags.has("--dry-run"),
    apply: flags.has("--apply"),
  };
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}. Provide it in scripts/.env.reseed or environment.`);
  return value;
}

async function countTable(admin: ReturnType<typeof createClient<any>>, table: string) {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    throw new Error("Provide --dry-run or --apply");
  }
  if (args.dryRun && args.apply) {
    throw new Error("Choose either --dry-run or --apply");
  }

  loadEnvFile(path.join(process.cwd(), "scripts", ".env.reseed"));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");

  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY looks like a publishable/anon key (sb_publishable_*). " +
        "You must use the *service_role* secret key from Supabase dashboard (Project Settings → API).",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tablesToWipe = [
    "grades",
    "evaluations",
    "attendance",
    "student_term_summaries",
    "homeworks",
    "timetable_events",
    "class_teachers",
    "teacher_subject_classes",
    "student_parents",
    "students",
    "classes",
  ];

  console.log("Supabase URL:", supabaseUrl);
  console.log("Target tables:", tablesToWipe.join(", "));
  const counts = await Promise.all(
    tablesToWipe.map(async (table) => ({
      table,
      count: await countTable(admin, table),
    })),
  );
  console.table(counts);

  if (args.dryRun) {
    console.log("Dry run: no changes applied.");
    return;
  }

  for (const table of tablesToWipe) {
    const { error } = await admin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
    console.log(`Cleared ${table}`);
  }

  console.log("Reset complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});