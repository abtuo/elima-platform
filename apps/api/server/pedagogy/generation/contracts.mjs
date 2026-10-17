import { z } from "zod";
import {
  PedagogicalBlockSchema,
  PedagogicalCorrectionSchema,
  PedagogicalResourceBundleSchema,
  PedagogicalGenerationRequestSchema,
} from "../../../../../packages/pedagogy/src/index.ts";

export { PedagogicalGenerationRequestSchema };

export const GenerationPlanSchema = z.strictObject({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2_000),
  objectives: z.array(z.string().min(1).max(300)).min(1).max(12),
  essentialConcepts: z.array(z.string().min(1).max(300)).min(1).max(30),
  sections: z.array(z.strictObject({ id: z.string().min(2).max(128), title: z.string().min(1).max(300), purpose: z.string().min(1).max(1_000) })).min(1).max(20),
  examples: z.array(z.string().min(1).max(500)).max(20),
  exerciseBlueprint: z.array(z.strictObject({ index: z.number().int().positive(), difficulty: z.enum(["easy", "intermediate", "advanced"]), questionType: z.enum(["single_choice", "multiple_choice", "true_false", "numeric", "fraction", "short_text", "long_text", "step_resolution", "table_analysis", "experiment_interpretation", "scientific_document_analysis"]), points: z.number().positive().max(20), concept: z.string().min(1).max(300) })).max(20),
  totalPoints: z.number().nonnegative().max(100),
});

export const GeneratedBlocksSchema = z.strictObject({ blocks: z.array(PedagogicalBlockSchema).max(500) });
export const GeneratedCorrectionsSchema = z.strictObject({ corrections: z.array(PedagogicalCorrectionSchema).max(100) });
export const RepairPatchSchema = z.strictObject({
  blocks: z.array(PedagogicalBlockSchema).max(50).default([]),
  corrections: z.array(PedagogicalCorrectionSchema).max(50).default([]),
});
export const GeneratedBundleSchema = PedagogicalResourceBundleSchema;

export function jsonSchema(schema, name) {
  const converted = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" });
  delete converted.$schema;
  return { name, schema: converted };
}

