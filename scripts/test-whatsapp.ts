/**
 * Test d'envoi WhatsApp via Azure (template welcome).
 * Usage: npm run test:whatsapp -- +2250708091011
 *
 * Important: charger .env.local AVANT d'importer whatsapp/env (imports ESM hoistés).
 */
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const _root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenvConfig({ path: path.join(_root, ".env") });
dotenvConfig({ path: path.join(_root, ".env.local"), override: true });

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: npm run test:whatsapp -- +2250708091011");
    process.exit(1);
  }

  const { sendWhatsAppWelcome } = await import("../src/lib/whatsapp");

  console.log(`Envoi du template welcome vers ${phone}…`);
  const result = await sendWhatsAppWelcome({ to: phone });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
