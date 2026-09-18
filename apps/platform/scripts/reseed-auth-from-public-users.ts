/*
  Reseed Supabase Auth users (Cloud) from public.users.

  Goal:
  - Ensure auth.users.id == public.users.id
  - Recreate Auth users for SCHOOL_ADMIN + TEACHER only
  - Apply a single password for everyone

  Safety:
  - By default, only deletes Auth users whose email exists in public.users (role in scope).
  - Run with --dry-run first.

  Usage:
    # 1) Create env file
    cp scripts/.env.reseed.example scripts/.env.reseed
    # 2) Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEED_PASSWORD
    # 0) Install runner (one time)
    npm i -D tsx
    # 3) Dry run
    npx tsx scripts/reseed-auth-from-public-users.ts --dry-run
    # 4) Apply
    npx tsx scripts/reseed-auth-from-public-users.ts --apply

  Notes:
  - This script uses the Supabase Admin API (service role key). Keep it secret.
*/

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type PublicUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: "SCHOOL_ADMIN" | "TEACHER" | string;
  school_id: string | null;
  full_name: string;
};

function parseArgs(argv: string[]) {
  const flags = new Set(argv.slice(2));
  return {
    dryRun: flags.has("--dry-run"),
    apply: flags.has("--apply"),
    createOnly: flags.has("--create-only"),
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
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Provide it in scripts/.env.reseed or environment.`);
  return v;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    throw new Error("Provide --dry-run or --apply");
  }
  if (args.dryRun && args.apply) {
    throw new Error("Choose either --dry-run or --apply");
  }

  // Load scripts/.env.reseed if present.
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
  const reseedPassword = process.env.RESEED_PASSWORD || "Password123!";
  const scopedDelete = (process.env.SCOPED_DELETE ?? "true").toLowerCase() === "true";

  // Admin client.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Load public.users in scope.
  const { data: users, error: usersErr } = await admin
    .from("users")
    .select("id,email,phone,role,school_id,full_name")
    .in("role", ["SCHOOL_ADMIN", "TEACHER"])
    .order("created_at", { ascending: true });
  if (usersErr) throw usersErr;

  const scoped = (users ?? []) as PublicUserRow[];
  const scopedByEmail = new Map<string, PublicUserRow>();
  for (const u of scoped) {
    const email = (u.email ?? "").trim().toLowerCase();
    if (!email) continue;
    if (!scopedByEmail.has(email)) scopedByEmail.set(email, u);
  }

  // 2) Compute plan.
  // If your Supabase Auth endpoint returns 500 on listUsers ("Database error finding users"),
  // we can't reliably enumerate existing Auth users from the API.
  //
  // We therefore provide two approaches:
  // - Recommended: delete by email set using SQL editor (see printed snippet), then run with --create-only.
  // - Alternative (limited): best-effort delete by public UUID (only deletes users where auth.id == public.users.id).

  const plan = scoped
    .filter((u) => (u.email ?? "").trim())
    .map((u) => ({
      publicUser: u,
      email: (u.email ?? "").trim().toLowerCase(),
    }));

  const toCreate = plan;

  // Output plan.
  console.log("Supabase URL:", supabaseUrl);
  console.log("Scoped delete:", scopedDelete);
  console.log("Public users in scope:", scoped.length);
  console.log("To create:", toCreate.length);
  console.log("Password:", reseedPassword ? "(set)" : "(empty)");

  console.log("\nIf you need to delete existing Auth users (recommended) run this in Supabase SQL editor first:\n");
  console.log(`-- Delete auth users that match public.users by email (SCHOOL_ADMIN/TEACHER)
with target as (
  select au.id
  from auth.users au
  join public.users pu on lower(au.email) = lower(pu.email)
  where pu.role in ('SCHOOL_ADMIN','TEACHER')
)
delete from auth.identities where user_id in (select id from target);

with target as (
  select au.id
  from auth.users au
  join public.users pu on lower(au.email) = lower(pu.email)
  where pu.role in ('SCHOOL_ADMIN','TEACHER')
)
delete from auth.users where id in (select id from target);
`);

  // Print a few examples.
  for (const p of toCreate.slice(0, 10)) {
    console.log(
      JSON.stringify(
        {
          email: p.email,
          publicId: p.publicUser.id,
          role: p.publicUser.role,
        },
        null,
        2,
      ),
    );
  }

  if (args.dryRun) {
    console.log("Dry run: no changes applied.");
    return;
  }

  // 3) Apply deletions (best-effort).
  if (!args.createOnly) {
    console.log("Deleting auth users by UUID (best-effort)...");
    for (const p of toCreate) {
      const { error } = await admin.auth.admin.deleteUser(p.publicUser.id);
      if (error) {
        // If not found, keep going.
        console.warn("Delete skipped", p.publicUser.id, error.message);
      }
    }
  } else {
    console.log("--create-only enabled: no Auth deletions performed by the script.");
  }

  // 4) Create users with fixed id + metadata.
  for (const p of toCreate) {
    const u = p.publicUser;
    const email = p.email;
    const meta = {
      role: u.role,
      school_id: u.school_id,
      full_name: u.full_name,
      phone: u.phone,
    };

    const { error } = await admin.auth.admin.createUser({
      id: u.id,
      email,
      password: reseedPassword,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) {
      throw new Error(`Failed to create auth user for ${email} with id=${u.id}: ${error.message}`);
    }
  }

  console.log("Done: auth reseeded from public.users.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
