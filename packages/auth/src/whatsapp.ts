export type AccountRegistrationInput = {
  role: "student";
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  schoolLevel: string;
  declaredSchoolName?: string;
  declaredSchoolCity?: string;
  authorization: string;
};


export function createWhatsAppAuthApi(apiFetch:(path:string,init?:RequestInit)=>Promise<Response>) {
type AuthFlowResponse = {
  message?: string;
  code?: string;
  ok?: boolean;
  phone?: string;
  requestToken?: string;
  authorization?: string | null;
  accountExists?: boolean;
  purpose?: "signup" | "password_reset" | "phone_control";
  expiresIn?: number;
  session?: { access_token: string; refresh_token?: string; expires_in?: number } | null;
};

async function request(path: string, body: unknown) {
  const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as AuthFlowResponse | null;
  if (!response.ok) throw new Error(payload?.message ?? "Service momentanément indisponible.");
  return payload ?? { ok: true };
}

async function requestRegistrationCode(phone: string) {
  const body = await request("/api/auth-verification-request", { phone, purpose: "signup" });
  if (!body.requestToken) throw new Error("Demande de vérification invalide.");
  return { requestToken: body.requestToken, expiresIn: body.expiresIn ?? 600 };
}

async function requestPasswordResetCode(phone: string) {
  const body = await request("/api/auth-verification-request", { phone, purpose: "password_reset" });
  if (!body.requestToken) throw new Error("Demande de vérification invalide.");
  return { requestToken: body.requestToken, expiresIn: body.expiresIn ?? 600 };
}

async function checkVerificationCode(input: { phone: string; code: string; requestToken: string }) {
  const body = await request("/api/auth-verification-check", input);
  if (!body.purpose) throw new Error("Vérification incomplète.");
  return { phone: body.phone ?? input.phone, authorization: body.authorization ?? "", purpose: body.purpose, accountExists: body.accountExists === true };
}

async function exchangePhoneControlForReset(input: { phone: string; authorization: string }) {
  const body = await request("/api/auth-password-reset", { action: "authorize", ...input });
  if (!body.authorization) throw new Error("Autorisation de réinitialisation invalide.");
  return body.authorization;
}

async function confirmPasswordReset(input: { phone: string; authorization: string; password: string }) {
  return request("/api/auth-password-reset", { action: "confirm", ...input });
}

async function registerElimaAccount(input: AccountRegistrationInput) {
  return request("/api/elima-signup", input);
}

return {requestRegistrationCode,requestPasswordResetCode,checkVerificationCode,exchangePhoneControlForReset,confirmPasswordReset,registerElimaAccount};
}
