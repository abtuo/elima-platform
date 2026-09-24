import {
  browserLocalAuthStorage,
  browserSessionAuthStorage,
  clearAuthSession,
  hasUsableAccessToken,
  readAuthSession,
  readStoredJson,
  writeAuthSession,
  writeStoredJson,
  type StoredAuthSession,
} from "@elima/auth";
import { apiFetch } from "./api/apiClient";
import { env } from "./env";
import { mainDbClient } from "./mainDbClient";

const FLOW_KEY = "elima_oauth_flow";
const SESSION_KEY = "elima_identity_session";

export type ElimaCentralProfile = {
  id?: string;
  fullName?: string;
  role?: string;
  schoolId?: string | null;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  avatarUrl?: string | null;
  studentId?: string | null;
  schoolLevel?: string | null;
  schoolClassName?: string | null;
};

function absoluteWebAsset(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return null;
  return url.startsWith("/") ? `${env.webBaseUrl.replace(/\/+$/, "")}${url}` : url;
}

function normalizeCentralProfile(raw: unknown): ElimaCentralProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const profile = raw as Record<string, unknown>;
  const schoolValue = Array.isArray(profile.school) ? profile.school[0] : profile.school;
  const school = schoolValue && typeof schoolValue === "object" ? schoolValue as Record<string, unknown> : null;
  const studentValue = Array.isArray(profile.student) ? profile.student[0] : profile.student;
  const student = studentValue && typeof studentValue === "object" ? studentValue as Record<string, unknown> : null;
  const classValue = Array.isArray(student?.class) ? student.class[0] : student?.class;
  const schoolClass = classValue && typeof classValue === "object" ? classValue as Record<string, unknown> : null;
  return {
    id: profile.id ? String(profile.id) : undefined,
    fullName: profile.fullName ? String(profile.fullName) : undefined,
    role: profile.role ? String(profile.role) : undefined,
    schoolId: profile.schoolId ? String(profile.schoolId) : null,
    schoolName: school?.name ? String(school.name) : null,
    schoolLogoUrl: absoluteWebAsset(school?.logo_url),
    avatarUrl: absoluteWebAsset(student?.photo_url),
    studentId: student?.id ? String(student.id) : null,
    schoolLevel: schoolClass?.level ? String(schoolClass.level) : null,
    schoolClassName: schoolClass?.name ? String(schoolClass.name) : null,
  };
}

function base64Url(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomValue(size = 32) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return base64Url(bytes); }

export function isElimaIdentityConfigured() {
  return Boolean(env.elimaIdentityUrl && env.elimaOAuthClientId && env.elimaOAuthRedirectUri);
}

export async function beginElimaSignIn(returnTo = "/") {
  if (!isElimaIdentityConfigured()) throw new Error("La connexion au compte Elima n’est pas configurée.");
  const verifier = randomValue(64);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const state = randomValue();
  const nonce = randomValue();
  writeStoredJson(browserSessionAuthStorage, FLOW_KEY, { verifier, state, nonce, returnTo, createdAt: Date.now() });
  const url = new URL(`${env.elimaIdentityUrl.replace(/\/+$/, "")}/auth/v1/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.elimaOAuthClientId);
  url.searchParams.set("redirect_uri", env.elimaOAuthRedirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", base64Url(new Uint8Array(digest)));
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url.toString());
}

export async function completeElimaSignIn(code: string, state: string) {
  if (!mainDbClient) throw new Error("La base Révision n’est pas configurée.");
  const flow = readStoredJson<{ verifier: string; state: string; returnTo: string; createdAt: number }>(browserSessionAuthStorage, FLOW_KEY);
  if (!flow || flow.state !== state || Date.now() - flow.createdAt > 15 * 60 * 1000) throw new Error("Demande de connexion invalide ou expirée.");
  const tokenResponse = await fetch(`${env.elimaIdentityUrl.replace(/\/+$/, "")}/auth/v1/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: env.elimaOAuthClientId, redirect_uri: env.elimaOAuthRedirectUri, code_verifier: flow.verifier }) });
  const tokens = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string } | null;
  if (!tokenResponse.ok || !tokens?.access_token) throw new Error(tokens?.error_description ?? "Échange OAuth impossible.");
  await bridgeElimaIdentitySession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_in: tokens.expires_in });
  browserSessionAuthStorage.removeItem(FLOW_KEY);
  return flow.returnTo || "/";
}

type ElimaIdentityTokens = { access_token: string; refresh_token?: string; expires_in?: number };

export async function completeElimaIdentitySession(tokens: ElimaIdentityTokens) {
  return bridgeElimaIdentitySession(tokens);
}

async function bridgeElimaIdentitySession(tokens: ElimaIdentityTokens) {
  if (!mainDbClient) throw new Error("La base Révision n’est pas configurée.");
  const bridgeResponse = await apiFetch("/api/identity-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: tokens.access_token }) });
  const bridge = await bridgeResponse.json().catch(() => null) as { tokenHash?: string; profile?: unknown; error?: string } | null;
  if (!bridgeResponse.ok || !bridge?.tokenHash) throw new Error(bridge?.error ?? "Liaison du compte impossible.");
  const verified = await mainDbClient.auth.verifyOtp({ token_hash: bridge.tokenHash, type: "magiclink" });
  if (verified.error) throw verified.error;
  writeAuthSession(browserLocalAuthStorage, SESSION_KEY, { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000, profile: normalizeCentralProfile(bridge.profile) });
  return {
    centralProfile: normalizeCentralProfile(bridge.profile),
    localUserId: verified.data.user?.id ?? verified.data.session?.user.id ?? null,
  };
}

export async function signInWithElimaPassword(identifier: string, password: string, options?: { recentSignup?: boolean }) {
  const response = await apiFetch("/api/elima-password-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identifier.trim(), password, recentSignup: options?.recentSignup === true }),
  });
  const tokens = await response.json().catch(() => null) as (ElimaIdentityTokens & { message?: string }) | null;
  if (!response.ok || !tokens?.access_token) throw new Error(tokens?.message ?? "Email, téléphone ou mot de passe incorrect.");
  return bridgeElimaIdentitySession(tokens);
}

export function getElimaIdentityAccessToken() {
  return readAuthSession<ElimaCentralProfile>(browserLocalAuthStorage, SESSION_KEY)?.accessToken ?? null;
}
export function getCachedElimaIdentityProfile(): ElimaCentralProfile | null {
  return readAuthSession<ElimaCentralProfile>(browserLocalAuthStorage, SESSION_KEY)?.profile ?? null;
}

export async function refreshElimaIdentityProfile() {
  const token = await getValidElimaIdentityAccessToken();
  if (!token) return getCachedElimaIdentityProfile();
  const response = await apiFetch("/api/elima-profile", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return getCachedElimaIdentityProfile();
  const profile = normalizeCentralProfile(await response.json().catch(() => null));
  if (!profile) return getCachedElimaIdentityProfile();
  const session = readAuthSession<ElimaCentralProfile>(browserLocalAuthStorage, SESSION_KEY);
  if (session) writeAuthSession(browserLocalAuthStorage, SESSION_KEY, { ...session, profile });
  return profile;
}
export async function getValidElimaIdentityAccessToken() {
  try {
    const session = readAuthSession<ElimaCentralProfile>(browserLocalAuthStorage, SESSION_KEY);
    if (!session) return null;
    if (hasUsableAccessToken(session)) return session.accessToken;
    if (!session.refreshToken) return null;
    const response = await fetch(`${env.elimaIdentityUrl.replace(/\/+$/, "")}/auth/v1/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken, client_id: env.elimaOAuthClientId }) });
    const tokens = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
    if (!response.ok || !tokens?.access_token) return null;
    const refreshedSession: StoredAuthSession<ElimaCentralProfile> = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? session.refreshToken, expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000, profile: session.profile ?? null };
    writeAuthSession(browserLocalAuthStorage, SESSION_KEY, refreshedSession);
    return tokens.access_token;
  } catch { return null; }
}
export function clearElimaIdentitySession() { clearAuthSession(browserLocalAuthStorage, SESSION_KEY); }

export function openElimaStudentSignup() {
  const startUrl = `${window.location.origin}/auth/elima/start`;
  window.location.assign(`${env.webBaseUrl.replace(/\/+$/, "")}/signup/student?return_to=${encodeURIComponent(startUrl)}`);
}
