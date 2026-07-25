import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const config = getTargetConfig();
const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_ID;
const demoRef = process.env.SUPABASE_DEMO_PROJECT_ID;
const appEnv = process.env.APP_ENV || process.env.VITE_APP_ENV;

if (appEnv !== "production") {
  throw new Error("Refus de sécurité : APP_ENV (ou VITE_APP_ENV) doit valoir production.");
}
if (!productionRef || config.targetRef !== productionRef) {
  throw new Error("Refus de sécurité : la cible ne correspond pas à SUPABASE_PRODUCTION_PROJECT_ID.");
}
if (demoRef && config.targetRef === demoRef) {
  throw new Error("Refus de sécurité : la cible correspond au projet Demo.");
}
await verifyServerKey(config);

const expected = `PUSH PRODUCTION ${config.targetRef}`;
const readline = createInterface({ input: process.stdin, output: process.stdout });
const answer = await readline.question(`Tapez exactement "${expected}" pour appliquer les migrations : `);
readline.close();
if (answer !== expected) throw new Error("Confirmation incorrecte : opération annulée.");

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.join(" ")} a échoué (${code ?? 1}).`));
    });
  });
}

await run(["scripts/prepare-unified-db.mjs"]);
await run(["scripts/apply-unified-db.mjs"]);
console.log(`[db:push:production] Schéma appliqué sur ${config.targetRef}. seed.demo.sql n'a pas été exécuté.`);
