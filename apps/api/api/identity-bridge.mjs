import { handleRevisionCors } from "../server/revisionCors.mjs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function resolveIdentityBridgeConfig(env = process.env) {
  const identityUrl = String(env.ELIMA_IDENTITY_URL ?? "").replace(/\/+$/, "");
  const identityPublishableKey = env.ELIMA_IDENTITY_PUBLISHABLE_KEY;
  const revisionUrl = String(env.REVISION_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const revisionSecret = env.REVISION_SUPABASE_SECRET_KEY || env.REVISION_SUPABASE_SERVICE_ROLE_KEY;
  if (!identityUrl || !identityPublishableKey || !revisionUrl || !revisionSecret || identityUrl === revisionUrl) {
    throw new Error("Configuration SSO incomplète.");
  }
  return { identityUrl, identityPublishableKey, revisionUrl, revisionSecret };
}

async function ensureRevisionProfile(admin, localUserId, identityEmail, fullName, phone) {
  const existing = await admin.from("users").select("id").eq("id", localUserId).maybeSingle();
  if (existing.error) return existing.error;
  if (existing.data) return null;
  const inserted = await admin.from("users").insert({
    id: localUserId,
    email: identityEmail,
    role: "STUDENT",
    full_name: fullName,
    phone: phone || null,
  });
  if (!inserted.error) return null;
  if (inserted.error.code === "23505") {
    const concurrent = await admin.from("users").select("id").eq("id", localUserId).maybeSingle();
    if (!concurrent.error && concurrent.data) return null;
  }
  return inserted.error;
}

export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") return response.status(405).json({ error: "Méthode non autorisée." });
  const accessToken = String(request.body?.accessToken ?? "");
  let config;
  try {
    config = resolveIdentityBridgeConfig();
  } catch {
    return response.status(503).json({ error: "Configuration du service de connexion incomplète." });
  }
  if (!accessToken) return response.status(401).json({ error: "Connexion Elima requise." });
  const { identityUrl, identityPublishableKey, revisionUrl, revisionSecret } = config;

  const userInfoResponse = await fetch(`${identityUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${accessToken}`, apikey: identityPublishableKey } });
  if (!userInfoResponse.ok) return response.status(401).json({ error: "Identité Elima invalide ou expirée." });
  const identity = await userInfoResponse.json();

  let profile = null;
  try {
    const profileResponse = await fetch("https://www.elima.ci/api/mobile/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (profileResponse.ok) profile = await profileResponse.json();
  } catch { /* le profil minimal OIDC reste utilisable */ }

  const externalSubject = String(identity.id ?? identity.sub ?? "").trim();
  const identityEmail = String(identity.email ?? profile?.email ?? "").trim().toLowerCase();
  if (!externalSubject) return response.status(403).json({ error: "L’identité Elima ne contient pas d’identifiant utilisateur." });
  if (profile?.id && String(profile.id) !== externalSubject) return response.status(403).json({ error: "Le profil Elima ne correspond pas à l’identité connectée." });
  if (!identityEmail) return response.status(403).json({ error: "Le profil Elima ne contient pas d’identifiant de connexion exploitable." });

  const issuer = `${identityUrl}/auth/v1`;
  const admin = createClient(revisionUrl, revisionSecret, { auth: { persistSession: false, autoRefreshToken: false } });
  const linkResult = await admin.from("identity_links").select("local_user_id").eq("issuer", issuer).eq("external_subject", externalSubject).maybeSingle();
  if (linkResult.error) return response.status(503).json({ error: "Le profil Révision est momentanément indisponible." });
  const link = linkResult.data;
  let localUserId = link?.local_user_id ?? null;
  if (!localUserId) {
    const profileResult = await admin.from("users").select("id").ilike("email", identityEmail).maybeSingle();
    if (profileResult.error) return response.status(503).json({ error: "Le profil Révision est momentanément indisponible." });
    const existingProfile = profileResult.data;
    localUserId = existingProfile?.id ?? null;
    if (!localUserId) {
      const created = await admin.auth.admin.createUser({ email: identityEmail, password: randomBytes(32).toString("base64url"), email_confirm: true, user_metadata: { role: profile?.role ?? "STUDENT", full_name: profile?.fullName ?? identity.user_metadata?.full_name ?? identity.name ?? identityEmail } });
      if (created.error || !created.data.user) return response.status(503).json({ error: "Création du profil Révision momentanément impossible." });
      localUserId = created.data.user.id;
    }
    const inserted = await admin.from("identity_links").insert({ local_user_id: localUserId, issuer, external_subject: externalSubject, external_school_id: profile?.schoolId ?? null, external_student_id: profile?.student?.id ?? null });
    if (inserted.error) {
      if (inserted.error.code !== "23505") return response.status(503).json({ error: "Liaison du profil Révision momentanément impossible." });
      const concurrent = await admin.from("identity_links").select("local_user_id").eq("issuer", issuer).eq("external_subject", externalSubject).maybeSingle();
      if (concurrent.error || !concurrent.data?.local_user_id) return response.status(503).json({ error: "Liaison du profil Révision momentanément impossible." });
      localUserId = concurrent.data.local_user_id;
    }
  } else {
    const updated = await admin.from("identity_links").update({ external_school_id: profile?.schoolId ?? null, external_student_id: profile?.student?.id ?? null, updated_at: new Date().toISOString() }).eq("local_user_id", localUserId);
    if (updated.error) return response.status(503).json({ error: "Mise à jour du profil Révision momentanément impossible." });
  }
  const localIdentity = await admin.auth.admin.getUserById(localUserId);
  if (localIdentity.error || !localIdentity.data.user) return response.status(503).json({ error: "La session Révision est momentanément indisponible." });
  const localProfileError = await ensureRevisionProfile(
    admin,
    localUserId,
    identityEmail,
    String(profile?.fullName ?? identity.user_metadata?.full_name ?? identity.name ?? identityEmail),
    String(identity.user_metadata?.phone ?? ""),
  );
  if (localProfileError) return response.status(503).json({ error: "Le profil Révision est momentanément indisponible." });
  if ((profile?.role ?? "STUDENT") === "STUDENT") {
    const linked = Boolean(profile?.schoolId && profile?.student?.id);
    const membership = await admin.from("student_profiles").upsert({
      id: localUserId,
      school_membership_status: linked ? "linked" : "standalone",
      linked_at: linked ? new Date().toISOString() : null,
    }, { onConflict: "id" });
    if (membership.error) return response.status(503).json({ error: "Le profil élève est momentanément indisponible." });
  }
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: identityEmail, options: { data: { identity_provider: "elima.ci" } } });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (generated.error || !tokenHash) return response.status(503).json({ error: "La session Révision est momentanément indisponible." });
  return response.status(200).json({ tokenHash, type: "magiclink", profile });
}
