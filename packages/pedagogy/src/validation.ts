import { PedagogicalResourceBundleSchema } from "./schemas.ts";
import type {
  PedagogicalBlock,
  PedagogicalCheck,
  PedagogicalCorrection,
  PedagogicalQuestion,
  PedagogicalResourceBundle,
  PedagogyValidationIssue,
  PedagogyValidationResult,
} from "./types.ts";

const PRIVATE_FIELD_NAMES = new Set([
  "answerKey", "expectedAnswer", "correctAnswer", "correctOptionId", "correctOptionIds",
  "correctionMarkdown", "solutionSteps", "hints", "rubric", "teacherComments", "secrets",
]);

const RESPONSE_KIND_BY_QUESTION: Record<PedagogicalQuestion["type"], PedagogicalQuestion["responseContract"]["kind"]> = {
  single_choice: "selection",
  multiple_choice: "selection",
  true_false: "boolean",
  numeric: "numeric",
  fraction: "fraction",
  short_text: "text",
  long_text: "text",
  step_resolution: "steps",
  table_analysis: "analysis",
  experiment_interpretation: "analysis",
  scientific_document_analysis: "analysis",
};

const ANSWER_KIND_BY_QUESTION: Record<PedagogicalQuestion["type"], PedagogicalCorrection["answerKey"]["kind"]> = {
  single_choice: "single_choice",
  multiple_choice: "multiple_choice",
  true_false: "boolean",
  numeric: "numeric",
  fraction: "fraction",
  short_text: "text",
  long_text: "text",
  step_resolution: "steps",
  table_analysis: "scientific_analysis",
  experiment_interpretation: "scientific_analysis",
  scientific_document_analysis: "scientific_analysis",
};

export class PedagogyValidationError extends Error {
  readonly issues: PedagogyValidationIssue[];

  constructor(issues: PedagogyValidationIssue[]) {
    super(`Ressource pédagogique invalide (${issues.length} erreur${issues.length > 1 ? "s" : ""}).`);
    this.name = "PedagogyValidationError";
    this.issues = issues;
  }
}

export function validateLatexExpression(latex: string): string[] {
  const errors: string[] = [];
  let depth = 0;
  for (let index = 0; index < latex.length; index += 1) {
    const current = latex[index];
    if (current === "\\") {
      index += 1;
      continue;
    }
    if (current === "{") depth += 1;
    if (current === "}") depth -= 1;
    if (depth < 0) {
      errors.push("Accolade fermante sans ouverture.");
      depth = 0;
    }
  }
  if (depth !== 0) errors.push("Accolades LaTeX non équilibrées.");
  if (/\\(?:html|href|url|includegraphics|input|write18)\b/i.test(latex)) errors.push("Commande LaTeX non autorisée dans un contenu pédagogique.");
  const begins = [...latex.matchAll(/\\begin\{([^}]+)\}/g)].map((match) => match[1]);
  const ends = [...latex.matchAll(/\\end\{([^}]+)\}/g)].map((match) => match[1]);
  if (begins.length !== ends.length || begins.some((name, index) => name !== ends[index])) errors.push("Environnement LaTeX non équilibré.");
  return errors;
}

function issue(level: PedagogyValidationIssue["level"], code: string, path: string, message: string): PedagogyValidationIssue {
  return { level, code, path, message };
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

function questionBlocks(blocks: PedagogicalBlock[]) {
  return blocks.filter((block): block is Extract<PedagogicalBlock, { type: "question" }> => block.type === "question");
}

function findPrivateField(value: unknown, path = "document"): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => findPrivateField(item, `${path}[${index}]`));
  const found: string[] = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`;
    if (PRIVATE_FIELD_NAMES.has(key)) found.push(nextPath);
    found.push(...findPrivateField(item, nextPath));
  }
  return found;
}

function checkMarkdownLatex(value: string) {
  const unescapedDollars = [...value.matchAll(/(?<!\\)\$/g)].length;
  return unescapedDollars % 2 === 0;
}

export function validateBusinessRules(bundle: PedagogicalResourceBundle): PedagogyValidationIssue[] {
  const errors: PedagogyValidationIssue[] = [];
  const { document, secrets } = bundle;
  const blocks = document.blocks;
  const questions = questionBlocks(blocks).map((block) => block.question);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const correctionByQuestion = new Map<string, PedagogicalCorrection[]>();
  for (const correction of secrets.corrections) {
    const matches = correctionByQuestion.get(correction.questionId) ?? [];
    matches.push(correction);
    correctionByQuestion.set(correction.questionId, matches);
  }

  if (secrets.resourceId !== document.id) errors.push(issue("business", "RESOURCE_SECRET_MISMATCH", "secrets.resourceId", "Les secrets ne ciblent pas la ressource publique."));
  if (secrets.schemaVersion !== document.metadata.schemaVersion) errors.push(issue("business", "SCHEMA_VERSION_MISMATCH", "secrets.schemaVersion", "Les versions de schéma publique et privée diffèrent."));

  for (const [path, values] of [
    ["document.blocks", blocks.map((block) => block.id)],
    ["document.questions", questions.map((question) => question.id)],
    ["document.metadata.objectives", document.metadata.objectives.map((item) => item.id)],
    ["document.metadata.competencies", document.metadata.competencies.map((item) => item.id)],
    ["document.metadata.references", document.metadata.references.map((item) => item.id)],
  ] as const) {
    for (const value of duplicateValues(values)) errors.push(issue("business", "DUPLICATE_ID", path, `L’identifiant « ${value} » est dupliqué.`));
  }

  const competencyIds = new Set(document.metadata.competencies.map((item) => item.id));
  const referenceIds = new Set(document.metadata.references.map((item) => item.id));
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const scientificBlockTypes = new Set(["image", "table", "chart", "diagram"]);

  for (const path of findPrivateField(document)) errors.push(issue("business", "PRIVATE_FIELD_IN_PUBLIC_DOCUMENT", path, "Un champ privé est présent dans le document public."));

  blocks.forEach((block, blockIndex) => {
    const path = `document.blocks[${blockIndex}]`;
    if ("sourceRefIds" in block) {
      for (const ref of block.sourceRefIds) if (!referenceIds.has(ref)) errors.push(issue("business", "UNKNOWN_SOURCE_REFERENCE", `${path}.sourceRefIds`, `La source « ${ref} » n’existe pas.`));
    }
    if (block.type === "formula") {
      for (const message of validateLatexExpression(block.latex)) errors.push(issue("business", "INVALID_LATEX", `${path}.latex`, message));
    }
    if (block.type === "table") {
      for (const [rowIndex, row] of block.rows.entries()) if (row.cells.length !== block.columns.length) errors.push(issue("business", "TABLE_WIDTH_MISMATCH", `${path}.rows[${rowIndex}].cells`, "Le nombre de cellules doit correspondre au nombre de colonnes."));
    }
    if (block.type === "chart") {
      for (const [seriesIndex, series] of block.series.entries()) if (series.values.length !== block.xAxis.values.length) errors.push(issue("business", "CHART_LENGTH_MISMATCH", `${path}.series[${seriesIndex}].values`, "La série et l’axe X doivent contenir le même nombre de valeurs."));
    }
    if (block.type === "diagram") {
      const nodes = new Set(block.nodes.map((node) => node.id));
      for (const [edgeIndex, edge] of block.edges.entries()) {
        if (!nodes.has(edge.from) || !nodes.has(edge.to)) errors.push(issue("business", "UNKNOWN_DIAGRAM_NODE", `${path}.edges[${edgeIndex}]`, "Une arête référence un nœud absent du schéma."));
      }
    }
    if (block.type === "exercise_group" || block.type === "assessment") {
      for (const ref of block.questionIds) if (!questionById.has(ref)) errors.push(issue("business", "UNKNOWN_QUESTION_REFERENCE", `${path}.questionIds`, `La question « ${ref} » n’existe pas.`));
      for (const ref of duplicateValues(block.questionIds)) errors.push(issue("business", "DUPLICATE_QUESTION_REFERENCE", `${path}.questionIds`, `La question « ${ref} » est référencée plusieurs fois.`));
      if (block.type === "assessment") {
        const actual = block.questionIds.reduce((sum, ref) => sum + (questionById.get(ref)?.points ?? 0), 0);
        if (Math.abs(actual - block.declaredPoints) > 1e-9) errors.push(issue("business", "ASSESSMENT_POINTS_MISMATCH", `${path}.declaredPoints`, `Le barème déclaré (${block.declaredPoints}) ne correspond pas à la somme des questions (${actual}).`));
      }
    }
    if (block.type === "document_analysis") {
      for (const ref of block.documentRefs) if (!scientificBlockTypes.has(blockById.get(ref)?.type ?? "")) errors.push(issue("business", "UNKNOWN_DOCUMENT_REFERENCE", `${path}.documentRefs`, `Le document scientifique « ${ref} » est absent ou incompatible.`));
      for (const ref of block.questionIds) if (!questionById.has(ref)) errors.push(issue("business", "UNKNOWN_QUESTION_REFERENCE", `${path}.questionIds`, `La question « ${ref} » n’existe pas.`));
    }
    if (block.type === "guided_activity") {
      for (const [stepIndex, step] of block.steps.entries()) for (const ref of step.blockRefs) if (!blockById.has(ref)) errors.push(issue("business", "UNKNOWN_BLOCK_REFERENCE", `${path}.steps[${stepIndex}].blockRefs`, `Le bloc « ${ref} » n’existe pas.`));
    }
  });

  for (const [questionIndex, question] of questions.entries()) {
    const path = `document.questions[${questionIndex}]`;
    if (question.responseContract.kind !== RESPONSE_KIND_BY_QUESTION[question.type]) errors.push(issue("business", "RESPONSE_CONTRACT_MISMATCH", `${path}.responseContract`, `Le contrat « ${question.responseContract.kind} » ne correspond pas au type « ${question.type} ».`));
    if (["single_choice", "multiple_choice"].includes(question.type)) {
      if (!question.options?.length) errors.push(issue("business", "OPTIONS_REQUIRED", `${path}.options`, "Les options sont obligatoires pour ce type de question."));
      if (question.responseContract.kind === "selection" && question.type === "single_choice" && (question.responseContract.minSelections !== 1 || question.responseContract.maxSelections !== 1)) errors.push(issue("business", "SINGLE_CHOICE_CARDINALITY", `${path}.responseContract`, "Un QCM simple doit autoriser exactement une sélection."));
    } else if (question.options) errors.push(issue("business", "UNEXPECTED_OPTIONS", `${path}.options`, "Ce type de question ne doit pas définir d’options."));
    for (const ref of question.skillRefs) if (!competencyIds.has(ref)) errors.push(issue("business", "UNKNOWN_COMPETENCY_REFERENCE", `${path}.skillRefs`, `La compétence « ${ref} » n’existe pas.`));
    for (const ref of question.documentRefs) if (!scientificBlockTypes.has(blockById.get(ref)?.type ?? "")) errors.push(issue("business", "UNKNOWN_DOCUMENT_REFERENCE", `${path}.documentRefs`, `Le document « ${ref} » est absent ou incompatible.`));
    if (["table_analysis", "experiment_interpretation", "scientific_document_analysis"].includes(question.type) && question.documentRefs.length === 0) errors.push(issue("business", "DOCUMENT_REFERENCE_REQUIRED", `${path}.documentRefs`, "Une question scientifique d’analyse doit référencer au moins un document."));
    if (!checkMarkdownLatex(question.promptMarkdown)) errors.push(issue("business", "UNBALANCED_MARKDOWN_MATH", `${path}.promptMarkdown`, "Les délimiteurs mathématiques $ ne sont pas équilibrés."));

    const corrections = correctionByQuestion.get(question.id) ?? [];
    if (corrections.length === 0) errors.push(issue("business", "MISSING_CORRECTION", `secrets.corrections`, `La question « ${question.id} » ne possède aucun corrigé.`));
    if (corrections.length > 1) errors.push(issue("business", "DUPLICATE_CORRECTION", `secrets.corrections`, `La question « ${question.id} » possède plusieurs corrigés.`));
    const correction = corrections[0];
    if (!correction) continue;
    if (correction.answerKey.kind !== ANSWER_KIND_BY_QUESTION[question.type]) errors.push(issue("business", "ANSWER_KEY_MISMATCH", `secrets.corrections.${question.id}.answerKey`, `La réponse privée « ${correction.answerKey.kind} » ne correspond pas au type « ${question.type} ».`));
    const rubricTotal = correction.rubric.reduce((sum, item) => sum + item.points, 0);
    if (Math.abs(rubricTotal - question.points) > 1e-9) errors.push(issue("business", "RUBRIC_POINTS_MISMATCH", `secrets.corrections.${question.id}.rubric`, `La grille totalise ${rubricTotal} point(s) au lieu de ${question.points}.`));
    if (correction.answerKey.kind === "single_choice") {
      const optionId = correction.answerKey.optionId;
      if (!question.options?.some((option) => option.id === optionId)) errors.push(issue("business", "UNKNOWN_CORRECT_OPTION", `secrets.corrections.${question.id}.answerKey`, "L’option correcte n’existe pas dans la question publique."));
    }
    if (correction.answerKey.kind === "multiple_choice") for (const optionId of correction.answerKey.optionIds) if (!question.options?.some((option) => option.id === optionId)) errors.push(issue("business", "UNKNOWN_CORRECT_OPTION", `secrets.corrections.${question.id}.answerKey`, `L’option correcte « ${optionId} » n’existe pas.`));
  }

  for (const correction of secrets.corrections) if (!questionById.has(correction.questionId)) errors.push(issue("business", "ORPHAN_CORRECTION", `secrets.corrections.${correction.questionId}`, "Ce corrigé ne correspond à aucune question publique."));

  const assessments = blocks.filter((block): block is Extract<PedagogicalBlock, { type: "assessment" }> => block.type === "assessment");
  if (document.metadata.declaredTotalPoints !== undefined) {
    const total = assessments.reduce((sum, assessment) => sum + assessment.declaredPoints, 0);
    if (Math.abs(total - document.metadata.declaredTotalPoints) > 1e-9) errors.push(issue("business", "RESOURCE_POINTS_MISMATCH", "document.metadata.declaredTotalPoints", `Le total déclaré (${document.metadata.declaredTotalPoints}) diffère des évaluations (${total}).`));
  }
  return errors;
}

function defaultPedagogicalChecks(bundle: PedagogicalResourceBundle): PedagogyValidationIssue[] {
  const warnings: PedagogyValidationIssue[] = [];
  if (bundle.document.metadata.validationStatus !== "validated") warnings.push(issue("pedagogical", "EXPERT_REVIEW_REQUIRED", "document.metadata.validationStatus", "Le contenu reste à valider par un expert et, le cas échéant, par un référentiel officiel."));
  if (bundle.document.metadata.references.some((reference) => reference.status === "unverified")) warnings.push(issue("pedagogical", "UNVERIFIED_REFERENCE", "document.metadata.references", "Au moins une référence pédagogique n’est pas validée."));
  for (const block of bundle.document.blocks) {
    if ((block.type === "table" || block.type === "chart" || block.type === "diagram" || block.type === "image") && !block.caption) warnings.push(issue("pedagogical", "SCIENTIFIC_CAPTION_RECOMMENDED", `document.blocks.${block.id}`, "Une légende scientifique est recommandée."));
    if (block.type === "image" && !block.uri) warnings.push(issue("pedagogical", "SCIENTIFIC_ASSET_MISSING", `document.blocks.${block.id}.uri`, "L’illustration reste indisponible et devra être associée avant publication."));
  }
  return warnings;
}

export function validatePedagogicalBundle(input: unknown, checks: PedagogicalCheck[] = []): PedagogyValidationResult<PedagogicalResourceBundle> {
  const parsed = PedagogicalResourceBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((error) => issue("structural", "SCHEMA_INVALID", error.path.length ? `bundle.${error.path.join(".")}` : "bundle", error.message)),
      warnings: [],
    };
  }
  const errors = validateBusinessRules(parsed.data);
  const warnings = [...defaultPedagogicalChecks(parsed.data), ...checks.flatMap((check) => check(parsed.data))];
  return { success: errors.length === 0, data: parsed.data, errors, warnings };
}

export function assertValidPedagogicalBundle(input: unknown, checks: PedagogicalCheck[] = []): PedagogicalResourceBundle {
  const result = validatePedagogicalBundle(input, checks);
  if (!result.success || !result.data) throw new PedagogyValidationError(result.errors);
  return result.data;
}
