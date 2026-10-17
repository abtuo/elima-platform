import type { PedagogicalCorrection, PedagogicalQuestion } from "./types.ts";
import { assertValidPedagogicalBundle } from "./validation.ts";

export const LEARNING_SUPPORTED_QUESTION_TYPES = [
  "single_choice", "multiple_choice", "true_false", "numeric", "fraction", "step_resolution",
] as const;

export type LearningCompatibleQuestionType = typeof LEARNING_SUPPORTED_QUESTION_TYPES[number];

export type LearningPublicQuestionDraft = {
  externalId: string;
  title: string;
  prompt: string;
  questionType: "choice" | "multiple_choice" | "boolean" | "numeric" | "rational" | "math_expression";
  position: number;
  points: number;
  skills: string[];
  publicMetadata: Record<string, unknown>;
};

export type LearningPrivateQuestionDraft = {
  externalId: string;
  expectedAnswer: unknown;
  validationConfig: Record<string, unknown>;
  correctionMetadata: Record<string, unknown>;
  hints: Array<{ level: number; content: string; scorePenalty: number }>;
  solutionSteps: Array<{ position: number; title?: string; content: string }>;
};

export type LearningQuestionDraft = {
  publicQuestion: LearningPublicQuestionDraft;
  privateQuestion: LearningPrivateQuestionDraft;
};

export type UnsupportedLearningQuestion = {
  questionId: string;
  questionType: PedagogicalQuestion["type"];
  reason: string;
};

export type LearningAdaptationResult = {
  resourceId: string;
  supported: LearningQuestionDraft[];
  unsupported: UnsupportedLearningQuestion[];
};

function optionMetadata(question: PedagogicalQuestion) {
  return question.options?.map((option) => ({ id: option.id, label: option.labelMarkdown })) ?? [];
}

function learningType(question: PedagogicalQuestion): LearningPublicQuestionDraft["questionType"] | null {
  if (question.type === "single_choice") return "choice";
  if (question.type === "multiple_choice") return "multiple_choice";
  if (question.type === "true_false") return "boolean";
  if (question.type === "numeric") return "numeric";
  if (question.type === "fraction") return "rational";
  if (question.type === "step_resolution") return "math_expression";
  return null;
}

function privateMapping(question: PedagogicalQuestion, correction: PedagogicalCorrection): Pick<LearningPrivateQuestionDraft, "expectedAnswer" | "validationConfig"> {
  const answer = correction.answerKey;
  if (answer.kind === "single_choice") return { expectedAnswer: answer.optionId, validationConfig: { type: "choice", correct: answer.optionId } };
  if (answer.kind === "multiple_choice") return { expectedAnswer: answer.optionIds, validationConfig: { type: "multiple_choice", correct: answer.optionIds } };
  if (answer.kind === "boolean") return { expectedAnswer: answer.value, validationConfig: { type: "boolean", value: answer.value } };
  if (answer.kind === "numeric") return { expectedAnswer: answer.value, validationConfig: { type: "numeric", value: answer.value, tolerance: answer.tolerance, ...(answer.unit ? { unit: answer.unit } : {}) } };
  if (answer.kind === "fraction") return { expectedAnswer: `${answer.numerator}/${answer.denominator}`, validationConfig: { type: "rational", value: answer.numerator / answer.denominator } };
  if (answer.kind === "steps") return { expectedAnswer: answer.finalAnswer ?? answer.requiredSteps.at(-1) ?? "", validationConfig: { type: "semantic", requires_steps: true, required_steps: answer.requiredSteps } };
  throw new Error(`Le type de correction « ${answer.kind} » n’est pas compatible avec Learning.`);
}

export function adaptResourceToLearning(input: unknown): LearningAdaptationResult {
  const bundle = assertValidPedagogicalBundle(input);
  const corrections = new Map(bundle.secrets.corrections.map((correction) => [correction.questionId, correction]));
  const supported: LearningQuestionDraft[] = [];
  const unsupported: UnsupportedLearningQuestion[] = [];
  let position = 0;

  for (const block of bundle.document.blocks) {
    if (block.type !== "question") continue;
    const question = block.question;
    const mappedType = learningType(question);
    if (!mappedType) {
      unsupported.push({
        questionId: question.id,
        questionType: question.type,
        reason: "Le moteur Learning actuel ne possède pas de contrat équivalent sûr pour ce type de question.",
      });
      continue;
    }
    const correction = corrections.get(question.id);
    if (!correction) throw new Error(`Corrigé introuvable pour ${question.id}.`);
    const mappedPrivate = privateMapping(question, correction);
    supported.push({
      publicQuestion: {
        externalId: question.id,
        title: question.title ?? `Question ${position + 1}`,
        prompt: question.promptMarkdown,
        questionType: mappedType,
        position,
        points: question.points,
        skills: [...question.skillRefs],
        publicMetadata: {
          answerFormat: mappedPrivate.validationConfig.type,
          options: optionMetadata(question),
          sourceResourceId: bundle.document.id,
          sourceSchemaVersion: bundle.document.metadata.schemaVersion,
          correctionMode: question.correctionMode,
        },
      },
      privateQuestion: {
        externalId: question.id,
        ...mappedPrivate,
        correctionMetadata: { sourceResourceId: bundle.document.id, sourceSchemaVersion: bundle.document.metadata.schemaVersion },
        hints: correction.hints.map((hint) => ({ level: hint.level, content: hint.markdown, scorePenalty: hint.level })),
        solutionSteps: correction.solutionSteps.map((step, index) => ({ position: index, ...(step.title ? { title: step.title } : {}), content: step.markdown })),
      },
    });
    position += 1;
  }
  return { resourceId: bundle.document.id, supported, unsupported };
}
