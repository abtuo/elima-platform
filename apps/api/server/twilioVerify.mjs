import { AuthFlowError } from "./identityAuth.mjs";

function config(env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const apiKey = env.TWILIO_API_KEY;
  const apiSecret = env.TWILIO_API_SECRET;
  const serviceSid = env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !apiKey || !apiSecret || !serviceSid) {
    throw new AuthFlowError("Service WhatsApp momentanément indisponible.", 503, "twilio_unavailable");
  }
  return { accountSid, apiKey, apiSecret, serviceSid };
}

function twilioError(status, checking = false) {
  if (status === 429) return new AuthFlowError("Trop de tentatives. Réessayez dans quelques minutes.", 429, "rate_limited");
  if (checking && status === 404) return new AuthFlowError("Ce code a expiré. Demandez-en un nouveau.", 400, "code_expired");
  if (checking && status >= 400 && status < 500) return new AuthFlowError("Ce code est incorrect. Vérifiez le message reçu sur WhatsApp.", 400, "invalid_code");
  return new AuthFlowError(checking ? "La vérification est momentanément indisponible. Réessayez dans quelques instants." : "Nous n’avons pas pu envoyer le code pour le moment. Réessayez dans quelques instants.", 503, "twilio_unavailable");
}

export function createTwilioVerifyClient({ env = process.env, fetchImpl = fetch } = {}) {
  const settings = config(env);
  const baseUrl = `https://verify.twilio.com/v2/Services/${encodeURIComponent(settings.serviceSid)}`;
  const authorization = `Basic ${Buffer.from(`${settings.apiKey}:${settings.apiSecret}`).toString("base64")}`;
  const call = async (path, body, checking) => {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/${path}`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
    } catch {
      throw twilioError(503, checking);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw twilioError(response.status, checking);
    return payload;
  };
  return {
    async send(phone) {
      const result = await call("Verifications", { To: phone, Channel: "whatsapp" }, false);
      if (!result || result.status !== "pending") throw twilioError(503, false);
    },
    async check(phone, code) {
      const result = await call("VerificationCheck", { To: phone, Code: code }, true);
      if (result?.status === "approved") return;
      if (result?.status === "canceled") throw new AuthFlowError("Trop de tentatives. Demandez un nouveau code.", 429, "too_many_checks");
      throw new AuthFlowError("Ce code est incorrect. Vérifiez le message reçu sur WhatsApp.", 400, "invalid_code");
    },
  };
}
