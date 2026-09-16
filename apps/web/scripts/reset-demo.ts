import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertDemoMode } from "../src/lib/app-mode";
import { DEMO_ACCOUNTS, DEMO_SCHOOL_IDS } from "./demo-config";

dotenvConfig({ path: path.join(process.cwd(), ".env") });
dotenvConfig({ path: path.join(process.cwd(), ".env.local"), override: true });

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function deleteBySchool(admin: SupabaseClient, table: string) {
  const { error } = await admin.from(table).delete().in("school_id", DEMO_SCHOOL_IDS);
  if (error && !/does not exist|Could not find the table|schema cache/i.test(error.message)) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  assertDemoMode();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  const admin = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  await admin.from("schools").update({ current_term_id: null }).in("id", DEMO_SCHOOL_IDS);

  for (const table of [
    "store_orders",
    "store_packs",
    "supply_lists",
    "store_products",
    "notifications",
    "audit_logs",
    "student_learning_profiles",
    "ai_insights",
    "academic_metrics",
    "reports",
    "payments",
    "student_fees",
    "fee_installments",
    "fee_structures",
    "student_payments",
    "whatsapp_messages",
    "attendance",
    "grades",
    "evaluations",
    "homeworks",
    "lesson_logs",
    "timetable_events",
    "conversations",
    "teacher_memos",
    "teacher_todos",
    "teachers",
    "parents",
    "students",
    "subjects",
    "terms",
    "classes",
  ]) {
    await deleteBySchool(admin, table);
  }

  const emails = new Set<string>(DEMO_ACCOUNTS.map((account) => account.email));
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email && emails.has(user.email)) {
      const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
      if (deleteErr) throw deleteErr;
    }
  }

  console.log("[reset:demo] Demo data reset complete.");
}

main().catch((error) => {
  console.error("[reset:demo] Fatal:", error);
  process.exit(1);
});
