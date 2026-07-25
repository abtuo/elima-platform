import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTargetConfig, verifyServerKey } from "./lib/supabase-target.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = getTargetConfig();
await verifyServerKey(config);

const tsxCli = path.join(root, "web", "node_modules", "tsx", "dist", "cli.mjs");
const seedFile = path.join(root, "web", "scripts", "seed-demo.ts");
const child = spawn(process.execPath, [tsxCli, seedFile], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    SUPABASE_URL: config.url,
    SUPABASE_SERVICE_ROLE_KEY: config.serverKey,
    ELIMA_APP_MODE: "demo",
    NODE_ENV: "development",
  },
});
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});
if (exitCode !== 0) process.exit(exitCode);
