import { readFile } from "node:fs/promises";
import { PedagogicalGenerationRequestSchema } from "../../../packages/pedagogy/src/index.ts";
import { createAzurePedagogicalGenerationClient } from "../server/pedagogy/generation/azureClient.mjs";

if (process.env.ELIMA_ALLOW_PAID_AZURE_TESTS !== "true") {
  throw new Error("Test payant refusé : définir explicitement ELIMA_ALLOW_PAID_AZURE_TESTS=true.");
}

const required = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_INPUT_COST_PER_MILLION", "AZURE_OPENAI_OUTPUT_COST_PER_MILLION"];
const missing = required.filter((name) => !String(process.env[name] ?? "").trim());
if (missing.length) throw new Error(`Configuration Azure incomplète : ${missing.join(", ")}`);

const maximumCost = Number(process.env.PEDAGOGICAL_AZURE_LIVE_MAX_COST);
if (!Number.isFinite(maximumCost) || maximumCost <= 0) {
  throw new Error("Définir PEDAGOGICAL_AZURE_LIVE_MAX_COST avec un plafond monétaire strict avant le test.");
}

const demos = [
  "mathematiques-3e-equations.request.json",
  "svt-terminale-d-tissu-nerveux.request.json",
];
const client = createAzurePedagogicalGenerationClient({ maxAttempts: 1 });
let totalCost = 0;
const results = [];

for (const file of demos) {
  const request = PedagogicalGenerationRequestSchema.parse(JSON.parse(await readFile(new URL(`../server/pedagogy/generation/demos/${file}`, import.meta.url), "utf8")));
  const started = Date.now();
  const result = await client.generate("plan", { request });
  totalCost += Number(result.telemetry.estimatedCost ?? 0);
  results.push({
    fixture: file,
    status: "Réussi",
    durationMs: Date.now() - started,
    inputTokens: result.telemetry.usage?.inputTokens ?? null,
    outputTokens: result.telemetry.usage?.outputTokens ?? null,
    estimatedCost: result.telemetry.estimatedCost,
    responseMode: result.telemetry.responseMode,
    model: result.telemetry.model,
    deployment: result.telemetry.deployment,
  });
  if (totalCost > maximumCost) throw new Error(`Plafond de coût dépassé (${totalCost} > ${maximumCost}). Arrêt immédiat.`);
}

console.log(JSON.stringify({ status: "Réussi", scope: "Azure réel - étape plan uniquement", totalCalls: results.length, totalEstimatedCost: totalCost, results }, null, 2));
