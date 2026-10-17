import { z } from "zod";

const boundedText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const PedagogicalGenerationRequestSchema = z.strictObject({
  country: boundedText(2, 100).default("Côte d’Ivoire"),
  countryCode: z.string().trim().length(2).default("CI"),
  educationSystem: boundedText(2, 120).default("Système éducatif ivoirien"),
  language: z.string().trim().min(2).max(16).default("fr"),
  level: boundedText(1, 100),
  track: boundedText(1, 100).optional(),
  subject: boundedText(1, 120),
  chapter: boundedText(1, 200),
  objectives: z.array(boundedText(2, 300)).min(1).max(12),
  competencies: z.array(boundedText(2, 300)).min(1).max(20),
  resourceType: z.enum(["revision_sheet", "course", "exercise_series", "mixed_support", "assessment", "exam_subject"]),
  difficulty: z.enum(["easy", "intermediate", "advanced", "progressive"]).default("progressive"),
  exerciseCount: z.number().int().min(0).max(20).default(8),
  estimatedMinutes: z.number().int().min(10).max(480).default(60),
  targetAudience: z.enum(["student", "teacher", "mixed"]).default("student"),
  detailLevel: z.enum(["concise", "standard", "detailed"]).default("standard"),
  totalPoints: z.number().positive().max(100).optional(),
  difficultyDistribution: z.strictObject({ easy: z.number().int().min(0).max(20), intermediate: z.number().int().min(0).max(20), advanced: z.number().int().min(0).max(20) }).optional(),
  teacherInstructions: z.string().trim().max(4_000).optional(),
  preferredTopics: z.array(boundedText(1, 200)).max(20).default([]),
  excludedTopics: z.array(boundedText(1, 200)).max(20).default([]),
  contextualExamples: z.array(boundedText(1, 300)).max(12).default([]),
  references: z.array(z.strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9._:-]*$/).max(128),
    title: boundedText(1, 300),
    publisher: boundedText(1, 300).optional(),
    url: z.url().optional(),
    license: boundedText(1, 200).optional(),
    version: boundedText(1, 100).optional(),
    status: z.enum(["unverified", "official", "editorially_validated"]).default("unverified"),
    excerpt: z.string().trim().min(1).max(12_000).optional(),
  })).max(8).default([]),
});

export type PedagogicalGenerationRequest = z.infer<typeof PedagogicalGenerationRequestSchema>;

