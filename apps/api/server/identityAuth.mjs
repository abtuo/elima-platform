import { createHmac, createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export class AuthFlowError extends Error {
  constructor(message, status = 400, code = "auth_flow_error") {
    super(message);
    this.name = "AuthFlowError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeWhatsAppPhone(value) {
  const compact = String(value ?? "").trim().replace(/[\s\-().]/g, "");
  const phone = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new AuthFlowError("Saisissez un numéro WhatsApp valide avec l’indicatif du pays.", 400, "invalid_phone");
  }
  return phone;
}

export function phoneToSyntheticEmail(phone) {
  return `${normalizeWhatsAppPhone(phone)}@phone.elima`;
}

export function resolveIdentityPublicConfig(env = process.env) {
  const url = String(env.ELIMA_IDENTITY_URL || "").replace(/\/+$/, "");
  const publishableKey = env.ELIMA_IDENTITY_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new AuthFlowError("Configuration du service d’identité incomplète.", 503, "identity_configuration_missing");
  return { url, publishableKey };
}

function identityConfig(env = process.env) {
  const { url, publishableKey } = resolveIdentityPublicConfig(env);
  const secret = env.ELIMA_IDENTITY_SECRET_KEY || env.ELIMA_IDENTITY_SERVICE_ROLE_KEY;
  if (!secret) throw new AuthFlowError("Configuration du service d’identité incomplète.", 503, "identity_configuration_missing");
  return { url, secret, publishableKey };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSupabaseIdentityStore({ env = process.env, now = () => new Date() } = {}) {
  const config = identityConfig(env);
  const admin = createClient(config.url, config.secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = config.publishableKey
    ? createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  const fingerprint = (value) => createHmac("sha256", config.secret).update(String(value)).digest("hex");

  async function registerAttempt({ phone, ip, action, since, phoneLimit, ipLimit }) {
    const phoneHash = fingerprint(`phone:${phone}`);
    const ipHash = ip ? fingerprint(`ip:${ip}`) : null;
    const phoneQuery = admin.from("auth_flow_attempts").select("id", { count: "exact", head: true }).eq("phone_hash", phoneHash).eq("action", action).gte("created_at", since.toISOString());
    const ipQuery = ipHash
      ? admin.from("auth_flow_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("action", action).gte("created_at", since.toISOString())
      : Promise.resolve({ count: 0, error: null });
    const [phoneResult, ipResult] = await Promise.all([phoneQuery, ipQuery]);
    if (phoneResult.error || ipResult.error) throw new AuthFlowError("Service momentanément indisponible.", 503, "storage_unavailable");
    if ((phoneResult.count ?? 0) >= phoneLimit || (ipResult.count ?? 0) >= ipLimit) {
      throw new AuthFlowError("Trop de tentatives. Réessayez dans quelques minutes.", 429, "rate_limited");
    }
    const inserted = await admin.from("auth_flow_attempts").insert({ phone_hash: phoneHash, ip_hash: ipHash, action });
    if (inserted.error) throw new AuthFlowError("Service momentanément indisponible.", 503, "storage_unavailable");
  }

  async function issueAuthorization({ phone, purpose, ttlSeconds }) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + ttlSeconds * 1000);
    const inserted = await admin.from("auth_flow_authorizations").insert({
      id: randomUUID(),
      token_hash: sha256(token),
      phone,
      phone_hash: fingerprint(`phone:${phone}`),
      purpose,
      expires_at: expiresAt.toISOString(),
    });
    if (inserted.error) throw new AuthFlowError("Service momentanément indisponible.", 503, "storage_unavailable");
    return { token, expiresAt };
  }

  async function authorization(token, phone, purposes) {
    if (!token || token.length < 32) throw new AuthFlowError("Autorisation invalide ou expirée.", 400, "invalid_authorization");
    const result = await admin.from("auth_flow_authorizations")
      .select("id,phone,purpose,expires_at,consumed_at,claimed_at,claim_id")
      .eq("token_hash", sha256(token)).eq("phone", phone).in("purpose", purposes).maybeSingle();
    if (result.error) throw new AuthFlowError("Service momentanément indisponible.", 503, "storage_unavailable");
    const row = result.data;
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() <= now().getTime()) {
      throw new AuthFlowError("Autorisation invalide ou expirée.", 400, "invalid_authorization");
    }
    return row;
  }

  async function claimAuthorization(token, phone, purpose) {
    const row = await authorization(token, phone, [purpose]);
    const claimId = randomUUID();
    const staleClaim = new Date(now().getTime() - 2 * 60_000).toISOString();
    const claimed = await admin.from("auth_flow_authorizations")
      .update({ claimed_at: now().toISOString(), claim_id: claimId })
      .eq("id", row.id).is("consumed_at", null).or(`claimed_at.is.null,claimed_at.lt.${staleClaim}`)
      .select("id,phone,purpose,expires_at,claim_id").maybeSingle();
    if (claimed.error) throw new AuthFlowError("Service momentanément indisponible.", 503, "storage_unavailable");
    if (!claimed.data) throw new AuthFlowError("Cette autorisation est déjà utilisée.", 409, "authorization_in_use");
    return claimed.data;
  }

  async function consumeAuthorization(claim) {
    const consumed = await admin.from("auth_flow_authorizations")
      .update({ consumed_at: now().toISOString(), claimed_at: null, claim_id: null })
      .eq("id", claim.id).eq("claim_id", claim.claim_id).is("consumed_at", null).select("id").maybeSingle();
    if (consumed.error || !consumed.data) throw new AuthFlowError("Cette autorisation a déjà été utilisée.", 409, "authorization_used");
  }

  async function releaseAuthorization(claim) {
    await admin.from("auth_flow_authorizations").update({ claimed_at: null, claim_id: null }).eq("id", claim.id).eq("claim_id", claim.claim_id).is("consumed_at", null);
  }

  async function accountByPhone(phone) {
    const email = phoneToSyntheticEmail(phone);
    const [byPhone, byEmail] = await Promise.all([
      admin.from("users").select("id,email,phone").eq("phone", phone).maybeSingle(),
      admin.from("users").select("id,email,phone").ilike("email", email).maybeSingle(),
    ]);
    if (byPhone.error || byEmail.error) throw new AuthFlowError("Service d’authentification momentanément indisponible.", 503, "identity_unavailable");
    return byPhone.data || byEmail.data || null;
  }

  async function createStudent(input) {
    const email = phoneToSyntheticEmail(input.phone);
    const fullName = `${input.firstName} ${input.lastName}`.trim();
    const created = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: "STUDENT",
        full_name: fullName,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        school_level: input.schoolLevel,
        school_level_id: input.schoolLevel,
        declared_school_name: input.declaredSchoolName || null,
        declared_school_city: input.declaredSchoolCity || null,
        cgu_accepted: true,
        cgu_version: "2026-09",
      },
    });
    if (created.error || !created.data.user) {
      const duplicate = /already|exists|registered/i.test(String(created.error?.message ?? ""));
      throw new AuthFlowError(duplicate ? "Ce numéro est déjà associé à un compte Elima." : "Création du compte impossible.", duplicate ? 409 : 503, duplicate ? "account_exists" : "identity_unavailable");
    }
    const profile = await admin.from("student_prospects").upsert({
      user_id: created.data.user.id,
      declared_school_name: input.declaredSchoolName || null,
      declared_school_city: input.declaredSchoolCity || null,
      school_level: input.schoolLevel || null,
      updated_at: now().toISOString(),
    });
    if (profile.error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      throw new AuthFlowError("Création du profil élève impossible.", 503, "profile_unavailable");
    }
    let session = null;
    if (publicClient) {
      const signedIn = await publicClient.auth.signInWithPassword({ email, password: input.password });
      if (signedIn.data.session) session = {
        access_token: signedIn.data.session.access_token,
        refresh_token: signedIn.data.session.refresh_token,
        expires_in: signedIn.data.session.expires_in,
      };
    }
    return { userId: created.data.user.id, session };
  }

  async function updatePassword(accountId, password) {
    const updated = await admin.auth.admin.updateUserById(accountId, { password });
    if (updated.error) throw new AuthFlowError("Modification du mot de passe impossible.", 503, "identity_unavailable");
  }

  return { registerAttempt, issueAuthorization, authorization, claimAuthorization, consumeAuthorization, releaseAuthorization, accountByPhone, createStudent, updatePassword };
}
