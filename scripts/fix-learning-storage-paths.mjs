import { createClient } from "@supabase/supabase-js";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const config = getTargetConfig();
await verifyServerKey(config);
const client = createClient(config.url, config.serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
const source = "cote-divoire/bac-2026-mathematiques-serie-c..pdf";
const target = "cote-divoire/bac-2026-mathematiques-serie-c.pdf";
const { data: objects, error: listError } = await client.storage.from("exam-sources").list("cote-divoire", { limit: 100 });
if (listError) throw listError;
const names = new Set((objects ?? []).map((item) => item.name));

if (names.has("bac-2026-mathematiques-serie-c.pdf")) {
  console.log(`Chemin déjà correct : ${target}`);
} else if (names.has("bac-2026-mathematiques-serie-c..pdf")) {
  const { error } = await client.storage.from("exam-sources").move(source, target);
  if (error) throw error;
  console.log(`PDF déplacé : ${source} -> ${target}`);
} else {
  throw new Error(`PDF source introuvable : ${source}`);
}
