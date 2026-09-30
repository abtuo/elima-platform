import { createClient } from "@supabase/supabase-js";

export class RevisionApiError extends Error {
  constructor(message, statusCode, code, retryAfter = null) {
    super(message);
    this.name = "RevisionApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function resolveRevisionServerConfig(env = process.env) {
  const url = String(env.REVISION_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const publishableKey = env.REVISION_SUPABASE_PUBLISHABLE_KEY || env.REVISION_SUPABASE_ANON_KEY;
  const secret = env.REVISION_SUPABASE_SECRET_KEY || env.REVISION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secret) {
    throw new RevisionApiError("Configuration Révision serveur incomplète.", 503, "revision_configuration_missing");
  }
  return { url, publishableKey, secret };
}

export async function authorizeRevisionRequest(request, { env = process.env, createSupabaseClient = createClient } = {}) {
  const authorization = String(request.headers?.authorization ?? "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new RevisionApiError("Connexion requise.", 401, "authentication_required");
  const config = resolveRevisionServerConfig(env);
  const publicClient = createSupabaseClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authenticated = await publicClient.auth.getUser(token);
  if (authenticated.error || !authenticated.data.user) {
    throw new RevisionApiError("Session invalide ou expirée.", 401, "invalid_session");
  }
  const admin = createSupabaseClient(config.url, config.secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user: authenticated.data.user, admin };
}

export async function consumeRevisionAiQuota(admin, userId, policy) {
  const { data, error } = await admin.rpc("consume_revision_ai_quota", {
    p_user_id: userId,
    p_action: policy.action,
    p_short_window_seconds: policy.windowSeconds,
    p_short_limit: policy.windowLimit,
    p_daily_limit: policy.dailyLimit,
  });
  if (error || !data || typeof data !== "object") {
    console.error("revision_ai_quota_failed", { action: policy.action, code: String(error?.code ?? "invalid_response") });
    throw new RevisionApiError("Le service de quota est momentanément indisponible.", 503, "quota_unavailable");
  }
  if (data.allowed !== true) {
    const retryAfter = Math.max(1, Number(data.retry_after ?? policy.windowSeconds));
    throw new RevisionApiError("Limite temporaire atteinte. Réessaie un peu plus tard.", 429, "quota_exceeded", retryAfter);
  }
  return data;
}

export function applyRevisionApiError(response, error, fallbackMessage) {
  const status = Number(error?.statusCode) || 500;
  const code = String(error?.code || "revision_service_error");
  if (error?.retryAfter) response.setHeader("Retry-After", String(error.retryAfter));
  const message = status < 500 && error instanceof Error ? error.message : error instanceof RevisionApiError ? error.message : fallbackMessage;
  return response.status(status).json({ code, message });
}
