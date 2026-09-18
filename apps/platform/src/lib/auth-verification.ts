import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone-auth";
import { sendWhatsAppAuthenticationCode } from "@/lib/whatsapp";

export type VerificationPurpose = "signup" | "password_reset";

export class AuthVerificationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function secret() {
  const value = env.AUTH_OTP_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new AuthVerificationError("Configuration OTP incomplète.", 500);
  return value;
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function normalizeAuthIdentifier(value: string) {
  const identifier = value.trim().toLowerCase();
  if (identifier.includes("@")) return identifier;
  const normalized = normalizePhone(identifier);
  const phone = normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new AuthVerificationError("Numéro international invalide.");
  return phone;
}

export function normalizeVerificationPhone(value: string) {
  const normalized = normalizePhone(value);
  const phone = normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new AuthVerificationError("Numéro WhatsApp international invalide.");
  return phone;
}

function equalHex(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requestVerificationCode(input: {
  identifier: string;
  phone: string;
  purpose: VerificationPurpose;
  ip?: string | null;
}) {
  const identifier = normalizeAuthIdentifier(input.identifier);
  const phone = normalizeVerificationPhone(input.phone);
  const identifierHash = digest(`identifier:${identifier}`);
  const phoneHash = digest(`phone:${phone}`);
  const admin = await createSupabaseAdminServerClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000).toISOString();

  const [{ count: identifierCount }, { data: latest }] = await Promise.all([
    admin.from("auth_verification_challenges").select("id", { count: "exact", head: true }).eq("identifier_hash", identifierHash).gte("created_at", fifteenMinutesAgo),
    admin.from("auth_verification_challenges").select("created_at").eq("phone_hash", phoneHash).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if ((identifierCount ?? 0) >= 5) throw new AuthVerificationError("Trop de codes demandés. Réessaie dans quinze minutes.", 429);
  if (latest?.created_at && Date.now() - new Date(latest.created_at).getTime() < 60_000) {
    throw new AuthVerificationError("Patiente une minute avant de demander un nouveau code.", 429);
  }

  if (input.ip) {
    const { count: ipCount } = await admin
      .from("auth_verification_challenges")
      .select("id", { count: "exact", head: true })
      .eq("requested_ip_hash", digest(`ip:${input.ip}`))
      .gte("created_at", fifteenMinutesAgo);
    if ((ipCount ?? 0) >= 20) throw new AuthVerificationError("Trop de demandes depuis cette connexion. Réessaie plus tard.", 429);
  }

  const id = randomUUID();
  const code = String(randomInt(100000, 1000000));
  const codeHash = digest(`code:${id}:${code}`);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await admin.from("auth_verification_challenges").insert({
    id,
    purpose: input.purpose,
    identifier_hash: identifierHash,
    phone_hash: phoneHash,
    code_hash: codeHash,
    expires_at: expiresAt,
    requested_ip_hash: input.ip ? digest(`ip:${input.ip}`) : null,
  });
  if (error) throw new AuthVerificationError(error.message.includes("auth_verification_challenges") ? "Migration OTP non appliquée." : error.message, 500);

  const sent = await sendWhatsAppAuthenticationCode({
    to: phone,
    code,
  });
  if (!sent.ok) {
    await admin.from("auth_verification_challenges").delete().eq("id", id);
    throw new AuthVerificationError(sent.reason, 502);
  }
  return { challengeId: id, expiresIn: 600 };
}

export async function verifyAuthCode(input: {
  challengeId: string;
  identifier: string;
  phone: string;
  code: string;
  purpose: VerificationPurpose;
}) {
  const identifier = normalizeAuthIdentifier(input.identifier);
  const phone = normalizeVerificationPhone(input.phone);
  const admin = await createSupabaseAdminServerClient();
  const { data: challenge } = await admin
    .from("auth_verification_challenges")
    .select("id,purpose,identifier_hash,phone_hash,code_hash,attempts,max_attempts,expires_at,consumed_at")
    .eq("id", input.challengeId)
    .maybeSingle();

  if (!challenge || challenge.purpose !== input.purpose || challenge.consumed_at) throw new AuthVerificationError("Code invalide ou déjà utilisé.");
  if (new Date(challenge.expires_at).getTime() <= Date.now()) throw new AuthVerificationError("Ce code a expiré. Demande un nouveau code.");
  if (challenge.attempts >= challenge.max_attempts) throw new AuthVerificationError("Nombre maximal d’essais atteint. Demande un nouveau code.", 429);

  const attempts = challenge.attempts + 1;
  const { data: attempted } = await admin
    .from("auth_verification_challenges")
    .update({ attempts })
    .eq("id", challenge.id)
    .eq("attempts", challenge.attempts)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!attempted) throw new AuthVerificationError("Une autre vérification est en cours. Réessaie.", 409);
  const validIdentity = equalHex(challenge.identifier_hash, digest(`identifier:${identifier}`)) && equalHex(challenge.phone_hash, digest(`phone:${phone}`));
  const validCode = /^\d{6}$/.test(input.code) && equalHex(challenge.code_hash, digest(`code:${challenge.id}:${input.code}`));
  if (!validIdentity || !validCode) throw new AuthVerificationError("Code incorrect.");
  return challenge.id;
}

export async function consumeAuthChallenge(challengeId: string) {
  const admin = await createSupabaseAdminServerClient();
  const { data, error } = await admin
    .from("auth_verification_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challengeId)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new AuthVerificationError("Ce code a déjà été utilisé.");
}
