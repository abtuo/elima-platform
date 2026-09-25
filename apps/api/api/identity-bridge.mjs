import { handleRevisionCors } from "../server/revisionCors.mjs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") return response.status(405).json({ error: "Méthode non autorisée." });
  const identityUrl = String(process.env.VITE_ELIMA_IDENTITY_URL ?? "").replace(/\/+$/, "");
  const localUrl = String(process.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const localSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = String(request.body?.accessToken ?? "");
  if (!identityUrl || !localUrl || !localSecret || !accessToken) return response.status(500).json({ error: "Configuration SSO incomplète." });

  const userInfoResponse = await fetch(`${identityUrl}/auth/v1/oauth/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!userInfoResponse.ok) return response.status(401).json({ error: "Identité Elima invalide ou expirée." });
  const identity = await userInfoResponse.json();

  let profile = null;
  try {
    const profileResponse = await fetch("https://www.elima.ci/api/mobile/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (profileResponse.ok) profile = await profileResponse.json();
  } catch { /* le profil minimal OIDC reste utilisable */ }

  const externalSubject = String(identity.sub ?? "").trim();
  const identityEmail = String(identity.email ?? profile?.email ?? "").trim().toLowerCase();
  if (!externalSubject) return response.status(403).json({ error: "L’identité Elima ne contient pas d’identifiant utilisateur." });
  if (profile?.id && String(profile.id) !== externalSubject) return response.status(403).json({ error: "Le profil Elima ne correspond pas à l’identité connectée." });
  if (!identityEmail) return response.status(403).json({ error: "Le profil Elima ne contient pas d’identifiant de connexion exploitable." });

  const issuer = `${identityUrl}/auth/v1`;
  const admin = createClient(localUrl, localSecret, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data: link } = await admin.from("identity_links").select("local_user_id").eq("issuer", issuer).eq("external_subject", externalSubject).maybeSingle();
  let localUserId = link?.local_user_id ?? null;
  if (!localUserId) {
    const { data: existingProfile } = await admin.from("users").select("id").ilike("email", identityEmail).maybeSingle();
    localUserId = existingProfile?.id ?? null;
    if (!localUserId) {
      const created = await admin.auth.admin.createUser({ email: identityEmail, password: randomBytes(32).toString("base64url"), email_confirm: true, user_metadata: { role: profile?.role ?? "STUDENT", full_name: profile?.fullName ?? identity.name ?? identityEmail } });
      if (created.error || !created.data.user) return response.status(400).json({ error: created.error?.message ?? "Création du profil Révision impossible." });
      localUserId = created.data.user.id;
    }
    const inserted = await admin.from("identity_links").insert({ local_user_id: localUserId, issuer, external_subject: externalSubject, external_school_id: profile?.schoolId ?? null, external_student_id: profile?.student?.id ?? null });
    if (inserted.error) return response.status(400).json({ error: inserted.error.message });
  } else {
    await admin.from("identity_links").update({ external_school_id: profile?.schoolId ?? null, external_student_id: profile?.student?.id ?? null, updated_at: new Date().toISOString() }).eq("local_user_id", localUserId);
  }
  if ((profile?.role ?? "STUDENT") === "STUDENT") {
    const linked = Boolean(profile?.schoolId && profile?.student?.id);
    const membership = await admin.from("student_profiles").upsert({
      id: localUserId,
      school_membership_status: linked ? "linked" : "standalone",
      linked_at: linked ? new Date().toISOString() : null,
    }, { onConflict: "id" });
    if (membership.error) return response.status(400).json({ error: membership.error.message });
  }
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: identityEmail, options: { data: { identity_provider: "elima.ci" } } });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (generated.error || !tokenHash) return response.status(400).json({ error: generated.error?.message ?? "Session Révision impossible." });
  return response.status(200).json({ tokenHash, type: "magiclink", profile });
}
