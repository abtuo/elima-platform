import { apiFetch } from "./api/apiClient";
export type RegistrationRole = "school_head" | "school_staff" | "teacher" | "parent" | "student";

export type AccountRegistrationInput = {
  role: Exclude<RegistrationRole, "school_head">;
  firstName: string;
  lastName: string;
  identifier: string;
  password: string;
  schoolCode?: string;
  schoolLevel?: string;
  declaredSchoolName?: string;
  declaredSchoolCity?: string;
  verificationPhone: string;
  verificationId: string;
  verificationCode: string;
};

async function readResponse(response: Response) {
  return await response.json().catch(() => null) as {
    message?: string;
    ok?: boolean;
    loginIdentifier?: string;
    session?: { access_token: string; refresh_token?: string; expires_in?: number } | null;
    challengeId?: string | null;
    expiresIn?: number;
  } | null;
}

export async function requestRegistrationCode(input: { identifier: string; phone: string }) {
  const response = await apiFetch("/api/auth-verification-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readResponse(response);
  if (!response.ok || !body?.challengeId) throw new Error(body?.message ?? "Envoi du code impossible.");
  return { challengeId: body.challengeId, expiresIn: body.expiresIn ?? 600 };
}

export async function requestPasswordResetCode(input: { identifier: string; phone: string }) {
  const response = await apiFetch("/api/auth-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "request", ...input }),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Demande impossible.");
  return { challengeId: body?.challengeId ?? null, expiresIn: body?.expiresIn ?? 600 };
}

export async function confirmPasswordReset(input: { identifier: string; phone: string; challengeId: string; code: string; password: string }) {
  const response = await apiFetch("/api/auth-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm", ...input }),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Réinitialisation impossible.");
  return body;
}

export async function registerElimaAccount(input: AccountRegistrationInput) {
  const response = await apiFetch("/api/elima-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Inscription impossible.");
  return body ?? { ok: true };
}

export type SchoolRegistrationRequest = {
  firstName: string;
  lastName: string;
  identifier: string;
  schoolName: string;
  schoolCity: string;
  jobTitle?: string;
  studentCount?: string;
};

export async function submitSchoolRegistrationRequest(input: SchoolRegistrationRequest) {
  const response = await fetch("/api/registration-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readResponse(response);
  if (!response.ok) throw new Error(body?.message ?? "Envoi impossible.");
  return body;
}
