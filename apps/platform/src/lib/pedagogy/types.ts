import type { PedagogicalGenerationRequest, PedagogyValidationIssue, StudentResourceView, TeacherResourceView } from "@elima/pedagogy";

export type EditorialState = "draft" | "in_review" | "changes_requested" | "validated" | "published" | "archived";
export type ResourceType = PedagogicalGenerationRequest["resourceType"];

export type PedagogicalResourceSummary = {
  id: string;
  createdByUserId: string;
  authorName?: string | null;
  title: string;
  resourceType: ResourceType;
  subject: string;
  level: string;
  chapter: string | null;
  searchMetadata?: { series?: string | null; track?: string | null } | null;
  state: EditorialState;
  currentVersionId: string | null;
  updatedAt: string;
};

export type PedagogicalVersion = {
  id: string;
  resourceId: string;
  versionNumber: number;
  state: EditorialState;
  lockVersion: number;
  updatedAt: string;
  publishedAt?: string | null;
  view?: StudentResourceView | TeacherResourceView;
};

export type ResourceDetail = { resource: PedagogicalResourceSummary; version: PedagogicalVersion | null };
export type ResourcePage = { items: PedagogicalResourceSummary[]; total: number; limit: number; offset: number };

export type GenerationStep = "plan" | "content" | "exercises" | "corrections" | "validate" | "persist";
export type GenerationJob = {
  id: string;
  request: PedagogicalGenerationRequest;
  status: "queued" | "running" | "failed" | "succeeded" | "cancelled";
  currentStep: GenerationStep;
  error?: { code?: string; message?: string; retryable?: boolean; validation?: unknown } | null;
  attempts: number;
  maxAttempts: number;
  resultResourceId?: string | null;
  resultVersionId?: string | null;
  updatedAt: string;
};

export type Review = { id: string; review_type: "automatic" | "human"; result: string; errors?: PedagogyValidationIssue[]; warnings?: PedagogyValidationIssue[]; reasons?: string[]; reviewed_at: string };

