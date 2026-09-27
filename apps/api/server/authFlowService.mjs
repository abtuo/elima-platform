import { AuthFlowError, createSupabaseIdentityStore, normalizeWhatsAppPhone } from "./identityAuth.mjs";
import { createTwilioVerifyClient } from "./twilioVerify.mjs";

const REQUEST_TTL = 10 * 60;
const AUTHORIZATION_TTL = 10 * 60;
const CONTROL_TTL = 5 * 60;

export function createAuthFlowService({ store, twilio, now = () => new Date() }) {
  const limit = (phone, ip, action, phoneLimit, ipLimit) => store.registerAttempt({ phone, ip, action, since: new Date(now().getTime() - 15 * 60_000), phoneLimit, ipLimit });

  return {
    async requestVerification({ phone: rawPhone, purpose, ip = null }) {
      const phone = normalizeWhatsAppPhone(rawPhone);
      if (!['signup', 'password_reset'].includes(purpose)) throw new AuthFlowError("Parcours de vérification invalide.", 400, "invalid_purpose");
      await limit(phone, ip, "otp_request", 3, 12);
      await twilio.send(phone);
      const issued = await store.issueAuthorization({ phone, purpose: `otp_${purpose}`, ttlSeconds: REQUEST_TTL });
      return { ok: true, requestToken: issued.token, expiresIn: REQUEST_TTL };
    },

    async checkVerification({ phone: rawPhone, code, requestToken, ip = null }) {
      const phone = normalizeWhatsAppPhone(rawPhone);
      if (!/^\d{4,10}$/.test(String(code ?? ""))) throw new AuthFlowError("Ce code est incorrect. Vérifiez le message reçu sur WhatsApp.", 400, "invalid_code");
      const requestProof = await store.authorization(requestToken, phone, ["otp_signup", "otp_password_reset"]);
      await limit(phone, ip, "otp_check", 10, 30);
      await twilio.check(phone, String(code));
      const claim = await store.claimAuthorization(requestToken, phone, requestProof.purpose);
      try {
        const account = await store.accountByPhone(phone);
        let purpose;
        let ttlSeconds;
        if (requestProof.purpose === "otp_password_reset") {
          purpose = "password_reset";
          ttlSeconds = AUTHORIZATION_TTL;
        } else if (account) {
          purpose = "phone_control";
          ttlSeconds = CONTROL_TTL;
        } else {
          purpose = "signup";
          ttlSeconds = AUTHORIZATION_TTL;
        }
        const authorization = account || purpose === "signup"
          ? await store.issueAuthorization({ phone, purpose, ttlSeconds })
          : null;
        await store.consumeAuthorization(claim);
        return { ok: true, phone, accountExists: Boolean(account), purpose, authorization: authorization?.token ?? null, expiresIn: ttlSeconds };
      } catch (error) {
        await store.releaseAuthorization(claim);
        throw error;
      }
    },

    async exchangePhoneControl({ phone: rawPhone, authorization }) {
      const phone = normalizeWhatsAppPhone(rawPhone);
      const claim = await store.claimAuthorization(authorization, phone, "phone_control");
      try {
        const account = await store.accountByPhone(phone);
        if (!account) throw new AuthFlowError("Compte Elima introuvable.", 400, "account_not_found");
        const reset = await store.issueAuthorization({ phone, purpose: "password_reset", ttlSeconds: AUTHORIZATION_TTL });
        await store.consumeAuthorization(claim);
        return { ok: true, authorization: reset.token, expiresIn: AUTHORIZATION_TTL };
      } catch (error) {
        await store.releaseAuthorization(claim);
        throw error;
      }
    },

    async signup(input) {
      const phone = normalizeWhatsAppPhone(input.phone);
      const firstName = String(input.firstName ?? "").trim();
      const lastName = String(input.lastName ?? "").trim();
      const password = String(input.password ?? "");
      if (!firstName || !lastName || !String(input.schoolLevel ?? "").trim()) throw new AuthFlowError("Prénom, nom et niveau requis.", 400, "invalid_profile");
      if (password.length < 8) throw new AuthFlowError("Le mot de passe doit contenir au moins 8 caractères.", 400, "invalid_password");
      const claim = await store.claimAuthorization(input.authorization, phone, "signup");
      try {
        if (await store.accountByPhone(phone)) {
          await store.consumeAuthorization(claim);
          throw new AuthFlowError("Ce numéro est déjà associé à un compte Elima.", 409, "account_exists");
        }
        const created = await store.createStudent({
          phone, firstName, lastName, password,
          schoolLevel: String(input.schoolLevel).trim(),
          declaredSchoolName: String(input.declaredSchoolName ?? "").trim(),
          declaredSchoolCity: String(input.declaredSchoolCity ?? "").trim(),
        });
        await store.consumeAuthorization(claim);
        return { ok: true, userId: created.userId, session: created.session ?? null };
      } catch (error) {
        if (error?.code !== "account_exists") await store.releaseAuthorization(claim);
        throw error;
      }
    },

    async resetPassword({ phone: rawPhone, authorization, password, ip = null }) {
      const phone = normalizeWhatsAppPhone(rawPhone);
      if (String(password ?? "").length < 8) throw new AuthFlowError("Le mot de passe doit contenir au moins 8 caractères.", 400, "invalid_password");
      await limit(phone, ip, "password_reset", 5, 15);
      const claim = await store.claimAuthorization(authorization, phone, "password_reset");
      try {
        const account = await store.accountByPhone(phone);
        if (!account?.id) throw new AuthFlowError("Compte Elima introuvable.", 400, "account_not_found");
        await store.updatePassword(account.id, String(password));
        await store.consumeAuthorization(claim);
        return { ok: true };
      } catch (error) {
        await store.releaseAuthorization(claim);
        throw error;
      }
    },
  };
}

let productionService;
export function getAuthFlowService() {
  if (!productionService) productionService = createAuthFlowService({ store: createSupabaseIdentityStore(), twilio: createTwilioVerifyClient() });
  return productionService;
}

export function clientIp(request) {
  return String(request.headers?.["x-forwarded-for"] ?? request.headers?.["x-real-ip"] ?? "").split(",")[0].trim() || null;
}

export function sendAuthFlowError(response, error, fallback) {
  if (error instanceof AuthFlowError) return response.status(error.status).json({ message: error.message, code: error.code });
  console.error(`[auth-flow] ${fallback}`, error instanceof Error ? error.message : "unknown error");
  return response.status(500).json({ message: fallback });
}
