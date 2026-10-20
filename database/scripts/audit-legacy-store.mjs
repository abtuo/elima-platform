import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = ["store_products", "store_packs", "store_pack_items", "store_orders", "store_order_items"];
const result = {};

for (const table of tables) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  result[table] = { rows: count ?? 0 };
}

const { data: schools, error: schoolsError } = await client.from("schools").select("id,is_demo");
if (schoolsError) throw schoolsError;
const demoSchoolIds = new Set((schools ?? []).filter((school) => school.is_demo).map((school) => school.id));

for (const table of ["store_products", "store_packs", "store_orders"]) {
  const { data, error } = await client.from(table).select("school_id");
  if (error) throw new Error(`${table}: ${error.message}`);
  result[table].demoRows = (data ?? []).filter((row) => demoSchoolIds.has(row.school_id)).length;
  result[table].nonDemoRows = (data ?? []).length - result[table].demoRows;
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
