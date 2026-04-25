/*
  Insère des présences / absences / retards fictifs sur les 14 derniers jours
  pour tous les élèves (idempotent : upsert sur student_id + date).

  Usage:
    cp scripts/.env.reseed.example scripts/.env.reseed   # si besoin
    # Renseigner SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL)

    npx tsx scripts/seed-demo-attendance.ts --dry-run
    npx tsx scripts/seed-demo-attendance.ts --apply
*/

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]) {
  const flags = new Set(argv.slice(2));
  return { dryRun: flags.has("--dry-run"), apply: flags.has("--apply") };
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
  if (!value) throw new Error(`Missing env ${name}.`);
  return value;
}

type StudentRow = { id: string; school_id: string; class_id: string };

function dateStringsLastDays(days: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function statusFor(studentId: string, dateStr: string): "PRESENT" | "ABSENT" | "LATE" {
  let h = 0;
  const s = `${studentId}|${dateStr}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  const m = Math.abs(h) % 12;
  if (m === 0) return "ABSENT";
  if (m === 1) return "LATE";
  return "PRESENT";
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    throw new Error("Indiquez --dry-run ou --apply");
  }
  if (args.dryRun && args.apply) {
    throw new Error("Choisissez soit --dry-run soit --apply");
  }

  loadEnvFile(path.join(process.cwd(), "scripts", ".env.reseed"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL manquant");

  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dates = dateStringsLastDays(14);
  const pageSize = 500;
  let offset = 0;
  let totalStudents = 0;
  let totalRows = 0;

  for (;;) {
    const { data: page, error } = await admin
      .from("students")
      .select("id, school_id, class_id")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (page ?? []) as StudentRow[];
    if (!rows.length) break;
    totalStudents += rows.length;

    const batch: Array<{
      school_id: string;
      class_id: string;
      student_id: string;
      status: "PRESENT" | "ABSENT" | "LATE";
      date: string;
    }> = [];
    for (const s of rows) {
      for (const date of dates) {
        batch.push({
          school_id: s.school_id,
          class_id: s.class_id,
          student_id: s.id,
          status: statusFor(s.id, date),
          date,
        });
      }
    }

    if (args.apply) {
      const chunk = 400;
      for (let i = 0; i < batch.length; i += chunk) {
        const slice = batch.slice(i, i + chunk);
        const { error: upErr } = await admin.from("attendance").upsert(slice, {
          onConflict: "student_id,date",
        });
        if (upErr) throw upErr;
      }
    }
    totalRows += batch.length;
    offset += pageSize;
  }

  console.log("Élèves traités:", totalStudents);
  console.log("Lignes présences (14 j × élèves):", totalRows);
  if (args.dryRun) {
    console.log("Dry-run : aucune écriture. Relancez avec --apply.");
    return;
  }
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
