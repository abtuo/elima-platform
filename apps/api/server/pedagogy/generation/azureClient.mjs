import { azureStructuredChat } from "../../azureOpenAi.mjs";
import { GeneratedBlocksSchema, GeneratedCorrectionsSchema, GenerationPlanSchema, RepairPatchSchema, jsonSchema } from "./contracts.mjs";
import { PEDAGOGICAL_PROMPT_VERSION, promptFor } from "./prompts.mjs";

const STEP_CONFIG = {
  plan: { schema: GenerationPlanSchema, maxTokens: 5_000 },
  content: { schema: GeneratedBlocksSchema, maxTokens: 12_000 },
  exercises: { schema: GeneratedBlocksSchema, maxTokens: 12_000 },
  corrections: { schema: GeneratedCorrectionsSchema, maxTokens: 12_000 },
  repair: { schema: RepairPatchSchema, maxTokens: 8_000 },
};

export function parseStrictJson(raw, schema) {
  const text = String(raw).trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  return schema.parse(JSON.parse(text));
}

export function createAzurePedagogicalGenerationClient({ env = process.env, fetchImpl = fetch, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), maxAttempts = 2 } = {}) {
  return {
    promptVersion: PEDAGOGICAL_PROMPT_VERSION,
    async generate(step, context) {
      const config = STEP_CONFIG[step];
      if (!config) throw Object.assign(new Error("Étape IA inconnue."), { code: "generation_step_unknown" });
      const structured = jsonSchema(config.schema, `pedagogy_${step}`);
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await azureStructuredChat(promptFor(step, context), {
            schema: structured.schema, schemaName: structured.name, maxTokens: config.maxTokens,
          }, env, fetchImpl);
          if (response.finishReason === "length") throw Object.assign(new Error("Sortie Azure tronquée."), { code: "generation_output_truncated", statusCode: 502 });
          const inputRate = Number(env.AZURE_OPENAI_INPUT_COST_PER_MILLION);
          const outputRate = Number(env.AZURE_OPENAI_OUTPUT_COST_PER_MILLION);
          const estimatedCost = response.usage && Number.isFinite(inputRate) && Number.isFinite(outputRate)
            ? (response.usage.inputTokens * inputRate + response.usage.outputTokens * outputRate) / 1_000_000
            : null;
          return { data: parseStrictJson(response.content, config.schema), telemetry: { ...response, content: undefined, calls: 1, promptVersion: PEDAGOGICAL_PROMPT_VERSION, estimatedCost } };
        } catch (error) {
          lastError = error;
          const transient = error?.refundableProviderFailure === true || [408, 429, 500, 502, 503, 504].includes(Number(error?.statusCode));
          if (!transient || attempt === maxAttempts) break;
          await wait(250 * (2 ** (attempt - 1)));
        }
      }
      throw lastError;
    },
  };
}

