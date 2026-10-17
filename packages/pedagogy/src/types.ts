import type { z } from "zod";
import type {
  AnswerKeySchema,
  AssessmentBlockSchema,
  PedagogicalBlockSchema,
  PedagogicalCorrectionSchema,
  PedagogicalQuestionSchema,
  PedagogicalResourceBundleSchema,
  PedagogicalResourceDocumentSchema,
  PedagogicalResourceMetadataSchema,
  PedagogicalResourceSecretsSchema,
  PrintableStudentViewSchema,
  PrintableTeacherViewSchema,
  StudentResourceViewSchema,
  TeacherResourceViewSchema,
} from "./schemas.ts";

export type PedagogicalResourceMetadata = z.infer<typeof PedagogicalResourceMetadataSchema>;
export type PedagogicalQuestion = z.infer<typeof PedagogicalQuestionSchema>;
export type PedagogicalBlock = z.infer<typeof PedagogicalBlockSchema>;
export type AssessmentBlock = z.infer<typeof AssessmentBlockSchema>;
export type AnswerKey = z.infer<typeof AnswerKeySchema>;
export type PedagogicalCorrection = z.infer<typeof PedagogicalCorrectionSchema>;
export type PedagogicalResourceDocument = z.infer<typeof PedagogicalResourceDocumentSchema>;
export type PedagogicalResourceSecrets = z.infer<typeof PedagogicalResourceSecretsSchema>;
export type PedagogicalResourceBundle = z.infer<typeof PedagogicalResourceBundleSchema>;
export type StudentResourceView = z.infer<typeof StudentResourceViewSchema>;
export type TeacherResourceView = z.infer<typeof TeacherResourceViewSchema>;
export type PrintableStudentView = z.infer<typeof PrintableStudentViewSchema>;
export type PrintableTeacherView = z.infer<typeof PrintableTeacherViewSchema>;

export type ValidationLevel = "structural" | "business" | "pedagogical";

export type PedagogyValidationIssue = {
  level: ValidationLevel;
  code: string;
  path: string;
  message: string;
};

export type PedagogyValidationResult<T> = {
  success: boolean;
  data?: T;
  errors: PedagogyValidationIssue[];
  warnings: PedagogyValidationIssue[];
};

export type PedagogicalCheck = (
  bundle: PedagogicalResourceBundle,
) => PedagogyValidationIssue[];
