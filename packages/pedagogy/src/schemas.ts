import { z } from "zod";

const id = z.string().min(2).max(128).regex(/^[a-z0-9][a-z0-9._:-]*$/, "Identifiant stable invalide.");
const markdown = z.string().min(1).max(100_000);
const shortText = z.string().min(1).max(500);
const nonNegative = z.number().finite().nonnegative();
const positive = z.number().finite().positive();

const ObjectiveSchema = z.strictObject({ id, label: shortText });
const CompetencySchema = z.strictObject({ id, label: shortText });

export const PedagogicalReferenceSchema = z.strictObject({
  id,
  title: shortText,
  publisher: z.string().min(1).max(300).optional(),
  url: z.url().optional(),
  locator: z.string().min(1).max(300).optional(),
  license: z.string().min(1).max(200).optional(),
  status: z.enum(["unverified", "official", "editorially_validated"]),
});

export const PedagogicalResourceMetadataSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  title: shortText,
  description: z.string().min(1).max(2_000),
  resourceType: z.enum(["revision_sheet", "course", "exercise_series", "assessment", "exam_subject", "learning_path", "mixed_support"]),
  language: z.string().min(2).max(16),
  countryCode: z.string().length(2).optional(),
  educationSystem: z.string().min(1).max(120).optional(),
  level: z.string().min(1).max(100),
  track: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(120),
  chapter: z.string().min(1).max(200),
  objectives: z.array(ObjectiveSchema).min(1).max(30),
  competencies: z.array(CompetencySchema).min(1).max(50),
  difficulty: z.enum(["introductory", "easy", "intermediate", "advanced", "progressive", "mixed"]),
  estimatedMinutes: z.number().int().positive().max(1_440),
  declaredTotalPoints: nonNegative.optional(),
  references: z.array(PedagogicalReferenceSchema).max(100).default([]),
  validationStatus: z.enum(["unreviewed", "pending_expert_review", "validated", "rejected"]),
  tags: z.array(z.string().min(1).max(80)).max(50).default([]),
});

const BaseBlockSchema = z.strictObject({ id, type: z.string() });
const SourceableSchema = z.strictObject({
  caption: z.string().max(1_000).optional(),
  sourceRefIds: z.array(id).max(20).default([]),
});

const HeadingBlockSchema = BaseBlockSchema.extend({ type: z.literal("heading"), level: z.number().int().min(1).max(6), text: shortText });
const RichTextBlockSchema = BaseBlockSchema.extend({ type: z.literal("rich_text"), markdown });
const DefinitionBlockSchema = BaseBlockSchema.extend({ type: z.literal("definition"), term: shortText, markdown });
const CalloutBlockSchema = BaseBlockSchema.extend({ type: z.literal("callout"), tone: z.enum(["info", "method", "warning", "success"]), title: shortText.optional(), markdown });
const FormulaBlockSchema = BaseBlockSchema.extend({ type: z.literal("formula"), latex: z.string().min(1).max(5_000), display: z.boolean().default(true), label: z.string().max(300).optional() });
const WorkedExampleBlockSchema = BaseBlockSchema.extend({
  type: z.literal("worked_example"),
  title: shortText,
  promptMarkdown: markdown,
  steps: z.array(z.strictObject({ id, title: z.string().max(300).optional(), markdown })).min(1).max(30),
  conclusionMarkdown: markdown.optional(),
});
const SummaryBlockSchema = BaseBlockSchema.extend({ type: z.literal("summary"), title: shortText.optional(), items: z.array(markdown).min(1).max(30) });

const ImageBlockSchema = BaseBlockSchema.extend({
  type: z.literal("image"),
  assetId: id,
  alt: z.string().min(1).max(1_000),
  uri: z.string().min(1).max(2_000).optional(),
  ...SourceableSchema.shape,
});

const TableBlockSchema = BaseBlockSchema.extend({
  type: z.literal("table"),
  title: shortText.optional(),
  columns: z.array(z.strictObject({ id, label: shortText, unit: z.string().min(1).max(40).optional() })).min(1).max(40),
  rows: z.array(z.strictObject({ id, cells: z.array(z.union([z.string(), z.number().finite(), z.boolean(), z.null()])).min(1).max(40) })).min(1).max(500),
  ...SourceableSchema.shape,
});

const ChartBlockSchema = BaseBlockSchema.extend({
  type: z.literal("chart"),
  chartType: z.enum(["line", "bar", "scatter"]),
  title: shortText,
  xAxis: z.strictObject({ label: shortText, unit: z.string().min(1).max(40).optional(), values: z.array(z.union([z.string(), z.number().finite()])).min(2).max(500) }),
  yAxis: z.strictObject({ label: shortText, unit: z.string().min(1).max(40).optional() }),
  series: z.array(z.strictObject({ id, label: shortText, values: z.array(z.number().finite()).min(2).max(500) })).min(1).max(20),
  ...SourceableSchema.shape,
});

const DiagramBlockSchema = BaseBlockSchema.extend({
  type: z.literal("diagram"),
  diagramType: z.enum(["flow", "anatomical", "cycle", "annotated_schema", "other"]),
  title: shortText,
  descriptionMarkdown: markdown,
  nodes: z.array(z.strictObject({ id, label: shortText, description: z.string().max(1_000).optional() })).min(1).max(100),
  edges: z.array(z.strictObject({ id, from: id, to: id, label: z.string().max(300).optional() })).max(200),
  ...SourceableSchema.shape,
});

const SelectionResponseSchema = z.strictObject({ kind: z.literal("selection"), minSelections: z.number().int().positive(), maxSelections: z.number().int().positive() });
const BooleanResponseSchema = z.strictObject({ kind: z.literal("boolean") });
const NumericResponseSchema = z.strictObject({ kind: z.literal("numeric"), unit: z.string().min(1).max(40).optional(), precision: z.number().int().min(0).max(12).optional() });
const FractionResponseSchema = z.strictObject({ kind: z.literal("fraction"), requireReducedForm: z.boolean().default(false) });
const TextResponseSchema = z.strictObject({ kind: z.literal("text"), minLength: z.number().int().nonnegative().optional(), maxLength: z.number().int().positive().max(20_000).optional() });
const StepsResponseSchema = z.strictObject({ kind: z.literal("steps"), minSteps: z.number().int().positive(), maxSteps: z.number().int().positive().max(20) });
const AnalysisResponseSchema = z.strictObject({ kind: z.literal("analysis"), expectedSections: z.array(shortText).max(20).default([]) });
export const ResponseContractSchema = z.discriminatedUnion("kind", [SelectionResponseSchema, BooleanResponseSchema, NumericResponseSchema, FractionResponseSchema, TextResponseSchema, StepsResponseSchema, AnalysisResponseSchema]);

const OptionSchema = z.strictObject({ id, labelMarkdown: markdown });
export const PedagogicalQuestionSchema = z.strictObject({
  id,
  type: z.enum(["single_choice", "multiple_choice", "true_false", "numeric", "fraction", "short_text", "long_text", "step_resolution", "table_analysis", "experiment_interpretation", "scientific_document_analysis"]),
  title: shortText.optional(),
  promptMarkdown: markdown,
  difficulty: z.enum(["easy", "intermediate", "advanced", "progressive"]),
  skillRefs: z.array(id).min(1).max(30),
  points: positive,
  documentRefs: z.array(id).max(20).default([]),
  options: z.array(OptionSchema).min(2).max(12).optional(),
  responseContract: ResponseContractSchema,
  correctionMode: z.enum(["deterministic", "human", "ai_assisted"]),
});

const QuestionBlockSchema = BaseBlockSchema.extend({ type: z.literal("question"), question: PedagogicalQuestionSchema });
const ExerciseGroupBlockSchema = BaseBlockSchema.extend({ type: z.literal("exercise_group"), title: shortText, introductionMarkdown: markdown.optional(), questionIds: z.array(id).min(1).max(100) });
const GuidedActivityBlockSchema = BaseBlockSchema.extend({
  type: z.literal("guided_activity"),
  title: shortText,
  steps: z.array(z.strictObject({ id, title: shortText, instructionMarkdown: markdown, blockRefs: z.array(id).max(30).default([]) })).min(1).max(50),
});
export const AssessmentBlockSchema = BaseBlockSchema.extend({
  type: z.literal("assessment"),
  title: shortText,
  instructionsMarkdown: markdown.optional(),
  questionIds: z.array(id).min(1).max(100),
  declaredPoints: positive,
  scale: z.number().finite().positive().default(20),
});
const DocumentAnalysisBlockSchema = BaseBlockSchema.extend({
  type: z.literal("document_analysis"),
  title: shortText,
  introductionMarkdown: markdown,
  documentRefs: z.array(id).min(1).max(20),
  questionIds: z.array(id).min(1).max(50),
});

export const PedagogicalBlockSchema = z.discriminatedUnion("type", [
  HeadingBlockSchema, RichTextBlockSchema, DefinitionBlockSchema, CalloutBlockSchema, FormulaBlockSchema,
  WorkedExampleBlockSchema, SummaryBlockSchema, ImageBlockSchema, TableBlockSchema, ChartBlockSchema,
  DiagramBlockSchema, DocumentAnalysisBlockSchema, QuestionBlockSchema, ExerciseGroupBlockSchema,
  GuidedActivityBlockSchema, AssessmentBlockSchema,
]);

export const PedagogicalResourceDocumentSchema = z.strictObject({
  id,
  metadata: PedagogicalResourceMetadataSchema,
  blocks: z.array(PedagogicalBlockSchema).min(1).max(1_000),
});

const ChoiceAnswerSchema = z.strictObject({ kind: z.literal("single_choice"), optionId: id });
const MultipleChoiceAnswerSchema = z.strictObject({ kind: z.literal("multiple_choice"), optionIds: z.array(id).min(1).max(12) });
const BooleanAnswerSchema = z.strictObject({ kind: z.literal("boolean"), value: z.boolean() });
const NumericAnswerSchema = z.strictObject({ kind: z.literal("numeric"), value: z.number().finite(), tolerance: nonNegative.default(0), unit: z.string().min(1).max(40).optional() });
const FractionAnswerSchema = z.strictObject({ kind: z.literal("fraction"), numerator: z.number().int(), denominator: z.number().int().refine((value) => value !== 0, "Le dénominateur ne peut pas être nul."), acceptedEquivalentForms: z.array(z.string().min(1).max(100)).max(20).default([]) });
const TextAnswerSchema = z.strictObject({ kind: z.literal("text"), expectedElements: z.array(markdown).min(1).max(50) });
const StepsAnswerSchema = z.strictObject({ kind: z.literal("steps"), finalAnswer: z.string().min(1).max(2_000).optional(), requiredSteps: z.array(markdown).min(1).max(30) });
const ScientificAnswerSchema = z.strictObject({ kind: z.literal("scientific_analysis"), expectedObservations: z.array(markdown).min(1).max(30), expectedInterpretation: z.array(markdown).min(1).max(30) });
export const AnswerKeySchema = z.discriminatedUnion("kind", [ChoiceAnswerSchema, MultipleChoiceAnswerSchema, BooleanAnswerSchema, NumericAnswerSchema, FractionAnswerSchema, TextAnswerSchema, StepsAnswerSchema, ScientificAnswerSchema]);

export const PedagogicalCorrectionSchema = z.strictObject({
  questionId: id,
  answerKey: AnswerKeySchema,
  correctionMarkdown: markdown,
  solutionSteps: z.array(z.strictObject({ id, title: z.string().max(300).optional(), markdown })).max(30).default([]),
  hints: z.array(z.strictObject({ id, level: z.number().int().min(1).max(5), markdown })).max(5).default([]),
  rubric: z.array(z.strictObject({ id, criterion: shortText, points: nonNegative })).min(1).max(30),
  teacherComments: z.string().max(10_000).optional(),
});

const PrintablePedagogicalCorrectionSchema = PedagogicalCorrectionSchema.extend({
  rubric: z.array(z.strictObject({ id, criterion: shortText, points: nonNegative })).max(30),
});

export const PedagogicalResourceSecretsSchema = z.strictObject({
  resourceId: id,
  schemaVersion: z.literal("1.0.0"),
  corrections: z.array(PedagogicalCorrectionSchema).max(1_000),
});

export const PedagogicalResourceBundleSchema = z.strictObject({
  document: PedagogicalResourceDocumentSchema,
  secrets: PedagogicalResourceSecretsSchema,
});

export const StudentResourceViewSchema = z.strictObject({ audience: z.literal("student"), document: PedagogicalResourceDocumentSchema });
export const TeacherResourceViewSchema = z.strictObject({ audience: z.literal("teacher"), document: PedagogicalResourceDocumentSchema, secrets: PedagogicalResourceSecretsSchema });
export const PrintableStudentViewSchema = z.strictObject({ audience: z.literal("student_print"), document: PedagogicalResourceDocumentSchema, print: z.strictObject({ includeAnswerSpaces: z.boolean() }) });
export const PrintableTeacherViewSchema = z.strictObject({
  audience: z.literal("teacher_print"),
  document: PedagogicalResourceDocumentSchema,
  secrets: z.strictObject({ resourceId: id, schemaVersion: z.literal("1.0.0"), corrections: z.array(PrintablePedagogicalCorrectionSchema).max(1_000) }),
  print: z.strictObject({ includeRubrics: z.boolean(), includeTeacherComments: z.boolean() }),
});
