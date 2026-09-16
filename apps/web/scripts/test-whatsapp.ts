/**
 * Test d'envoi WhatsApp via le provider actif (Twilio ou Azure).
 * Usage: npm run test:whatsapp -- +2250708091011 "Bonjour depuis Elima"
 *
 * Important: charger .env.local AVANT d'importer whatsapp/env (imports ESM hoistes).
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
    console.error('Usage: npm run test:whatsapp -- +2250708091011 "Bonjour depuis Elima"');
    process.exit(1);
  }

  const message = process.argv.slice(3).join(" ").trim() || "Test WhatsApp Elima.";
  const { sendWhatsAppMessage } = await import("../src/lib/whatsapp");

  console.log(`Envoi du message WhatsApp vers ${phone}...`);
  const result = await sendWhatsAppMessage({ to: phone, body: message });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
