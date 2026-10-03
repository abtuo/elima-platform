import { handleRevisionCors } from "../revisionCors.mjs";
import { resolveIdentityPublicConfig } from "../identityAuth.mjs";

// Identity only: never use the Revision project's URL or server key here.
export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (handleRevisionCors(request, response, ["POST", "DELETE"])) return;
  if (!["POST", "DELETE"].includes(request.method)) return response.status(405).json({ message: "Méthode non autorisée." });
  let config;
  try { config = resolveIdentityPublicConfig(); }
  catch { return response.status(503).json({ code: "identity_configuration_missing", message: "Service de connexion momentanément indisponible." }); }

  const logout = request.method === "DELETE";
  const token = logout ? request.headers?.authorization : request.body?.refresh_token;
  if (typeof token !== "string" || !token.trim() || token.length > 16384) {
    return response.status(401).json({ code: "invalid_session", message: "Reconnectez-vous à votre compte Elima." });
  }
  try {
    const upstream = await fetch(`${config.url}/auth/v1/${logout ? "logout?scope=local" : "token?grant_type=refresh_token"}`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", apikey: config.publishableKey, ...(logout ? { Authorization: token } : {}) },
      ...(!logout ? { body: JSON.stringify({ refresh_token: token }) } : {}),
    });
    if (logout && (upstream.ok || upstream.status === 401 || upstream.status === 403)) return response.status(204).end();
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const invalid = ["refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired", "user_not_found", "user_banned", "invalid_grant"].includes(body?.error_code ?? body?.code ?? body?.error);
      return response.status(invalid ? 401 : upstream.status === 429 ? 429 : 503).json({
        code: invalid ? "invalid_session" : "identity_unavailable",
        message: invalid ? "Votre session a expiré. Reconnectez-vous." : "Service de connexion momentanément indisponible.",
      });
    }
    if (!body?.access_token || !body?.refresh_token || !Number.isFinite(body.expires_in)) throw new Error("Invalid session response");
    return response.status(200).json({ access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in, expires_at: body.expires_at });
  } catch {
    return response.status(503).json({ code: "identity_unavailable", message: "Service de connexion momentanément indisponible." });
  }
}
