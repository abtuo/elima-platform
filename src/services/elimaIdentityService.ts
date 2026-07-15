import { env } from "./env";
import { mainDbClient } from "./mainDbClient";

const FLOW_KEY = "elima_oauth_flow";
const SESSION_KEY = "elima_identity_session";

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
  sessionStorage.setItem(FLOW_KEY, JSON.stringify({ verifier, state, nonce, returnTo, createdAt: Date.now() }));
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
  const rawFlow = sessionStorage.getItem(FLOW_KEY);
  const flow = rawFlow ? JSON.parse(rawFlow) as { verifier: string; state: string; returnTo: string; createdAt: number } : null;
  if (!flow || flow.state !== state || Date.now() - flow.createdAt > 15 * 60 * 1000) throw new Error("Demande de connexion invalide ou expirée.");
  const tokenResponse = await fetch(`${env.elimaIdentityUrl.replace(/\/+$/, "")}/auth/v1/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: env.elimaOAuthClientId, redirect_uri: env.elimaOAuthRedirectUri, code_verifier: flow.verifier }) });
  const tokens = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string } | null;
  if (!tokenResponse.ok || !tokens?.access_token) throw new Error(tokens?.error_description ?? "Échange OAuth impossible.");
  const bridgeResponse = await fetch("/api/identity-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: tokens.access_token }) });
  const bridge = await bridgeResponse.json().catch(() => null) as { tokenHash?: string; error?: string } | null;
  if (!bridgeResponse.ok || !bridge?.tokenHash) throw new Error(bridge?.error ?? "Liaison du compte impossible.");
  const verified = await mainDbClient.auth.verifyOtp({ token_hash: bridge.tokenHash, type: "magiclink" });
  if (verified.error) throw verified.error;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000 }));
  sessionStorage.removeItem(FLOW_KEY);
  return flow.returnTo || "/";
}

export function getElimaIdentityAccessToken() {
  try { return (JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { accessToken?: string } | null)?.accessToken ?? null; }
  catch { return null; }
}
export async function getValidElimaIdentityAccessToken() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { accessToken?: string; refreshToken?: string; expiresAt?: number } | null;
    if (!session?.accessToken) return null;
    if (Number(session.expiresAt ?? 0) > Date.now() + 30_000) return session.accessToken;
    if (!session.refreshToken) return null;
    const response = await fetch(`${env.elimaIdentityUrl.replace(/\/+$/, "")}/auth/v1/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken, client_id: env.elimaOAuthClientId }) });
    const tokens = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
    if (!response.ok || !tokens?.access_token) return null;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? session.refreshToken, expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000 }));
    return tokens.access_token;
  } catch { return null; }
}
export function clearElimaIdentitySession() { localStorage.removeItem(SESSION_KEY); }

export function openElimaStudentSignup() {
  const startUrl = `${window.location.origin}/auth/elima/start`;
  window.location.assign(`${env.webBaseUrl.replace(/\/+$/, "")}/signup/student?return_to=${encodeURIComponent(startUrl)}`);
}
