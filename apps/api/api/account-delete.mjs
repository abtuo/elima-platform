import { createClient } from "@supabase/supabase-js";
import { handleRevisionCors } from "../server/revisionCors.mjs";

export function resolveAccountDeletionConfig(env = process.env) {
  const identityUrl = String(env.ELIMA_IDENTITY_URL ?? "").replace(/\/+$/, "");
  const identityPublicKey = env.ELIMA_IDENTITY_PUBLISHABLE_KEY;
  const identitySecret = env.ELIMA_IDENTITY_SECRET_KEY || env.ELIMA_IDENTITY_SERVICE_ROLE_KEY;
  const revisionUrl = String(env.REVISION_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const revisionPublicKey = env.REVISION_SUPABASE_PUBLISHABLE_KEY || env.REVISION_SUPABASE_ANON_KEY;
  const revisionSecret = env.REVISION_SUPABASE_SECRET_KEY || env.REVISION_SUPABASE_SERVICE_ROLE_KEY;
  if (!identityUrl || !identityPublicKey || !identitySecret || !revisionUrl || !revisionPublicKey || !revisionSecret || identityUrl === revisionUrl) {
    throw apiError(503, "account_deletion_configuration_missing", "Le service de suppression de compte est momentanément indisponible.");
  }
  return { identityUrl, identityPublicKey, identitySecret, revisionUrl, revisionPublicKey, revisionSecret };
}

export function createHandler(dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const detectUsage = dependencies.detectCentralIdentityUsage ?? detectCentralIdentityUsage;

  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
    try {
      const config = resolveAccountDeletionConfig(env);
      const localToken = bearerToken(request);
      const identityToken = String(request.body?.identityAccessToken ?? "").trim();
      const password = String(request.body?.password ?? "");
      const confirmation = String(request.body?.confirmation ?? "").trim().toUpperCase();
      if (!localToken || !identityToken) throw apiError(401, "authentication_required", "Reconnecte-toi avant de supprimer ton compte.");
      if (password.length < 8 || confirmation !== "SUPPRIMER") throw apiError(400, "confirmation_required", "Confirme ton mot de passe et saisis SUPPRIMER.");

      const revisionPublic = createSupabaseClient(config.revisionUrl, config.revisionPublicKey, { auth: noSession() });
      const identityPublic = createSupabaseClient(config.identityUrl, config.identityPublicKey, { auth: noSession() });
      const revisionAdmin = createSupabaseClient(config.revisionUrl, config.revisionSecret, { auth: noSession() });
      const identityAdmin = createSupabaseClient(config.identityUrl, config.identitySecret, { auth: noSession() });
      const [localResult, identityResult] = await Promise.all([
        revisionPublic.auth.getUser(localToken),
        identityPublic.auth.getUser(identityToken),
      ]);
      const localUser = localResult.data?.user;
      const identityUser = identityResult.data?.user;
      if (localResult.error || !localUser || identityResult.error || !identityUser?.id || !identityUser.email) {
        throw apiError(401, "invalid_session", "Ta session a expiré. Reconnecte-toi puis réessaie.");
      }

      const verified = await identityPublic.auth.signInWithPassword({ email: identityUser.email, password });
      if (verified.error || verified.data?.user?.id !== identityUser.id) {
        throw apiError(401, "identity_confirmation_failed", "Le mot de passe est incorrect.");
      }

      const issuer = `${config.identityUrl}/auth/v1`;
      const linked = await revisionAdmin.from("identity_links")
        .select("local_user_id,external_subject,external_school_id,external_student_id")
        .eq("local_user_id", localUser.id).eq("issuer", issuer).eq("external_subject", identityUser.id).maybeSingle();
      if (linked.error || !linked.data) throw apiError(409, "identity_link_missing", "Le lien entre tes comptes ne peut pas être vérifié. Contacte le support.");

      const usage = await detectUsage(identityAdmin, identityUser.id, linked.data);
      await removePendingUploads(revisionAdmin, localUser.id);
      const localDeletion = await revisionAdmin.auth.admin.deleteUser(localUser.id);
      if (localDeletion.error) throw apiError(503, "revision_deletion_failed", "La suppression de tes données Révision a échoué. Réessaie plus tard.");

      if (usage.shared) {
        return response.status(200).json({ status: "shared_identity", identityDeleted: false });
      }

      const identityDeletion = await identityAdmin.auth.admin.deleteUser(identityUser.id);
      if (identityDeletion.error) throw apiError(503, "identity_deletion_failed", "Tes données Révision ont été supprimées, mais la suppression du compte Elima doit être finalisée. Contacte le support.");
      return response.status(200).json({ status: "deleted", identityDeleted: true });
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      const code = String(error?.code ?? "account_deletion_failed");
      const message = error?.statusCode ? error.message : "La suppression du compte est momentanément indisponible.";
      if (!error?.statusCode) console.error("account_deletion_failed", { code: String(error?.code ?? error?.name ?? "unknown") });
      return response.status(status).json({ code, message });
    }
  };
}

export async function detectCentralIdentityUsage(identityAdmin, identityUserId, link) {
  if (link.external_school_id || link.external_student_id) return { shared: true, reason: "revision_link" };
  const [profile, memberships, students, teachers, parents] = await Promise.all([
    identityAdmin.from("users").select("id,role,school_id").eq("id", identityUserId).maybeSingle(),
    identityAdmin.from("school_memberships").select("id", { count: "exact", head: true }).eq("user_id", identityUserId).neq("status", "left"),
    identityAdmin.from("students").select("id", { count: "exact", head: true }).eq("user_id", identityUserId),
    identityAdmin.from("teachers").select("id", { count: "exact", head: true }).eq("user_id", identityUserId),
    identityAdmin.from("parents").select("id", { count: "exact", head: true }).eq("user_id", identityUserId),
  ]);
  if ([profile, memberships, students, teachers, parents].some((result) => result.error) || !profile.data) {
    return { shared: true, reason: "indeterminate" };
  }
  const shared = Boolean(profile.data.school_id)
    || String(profile.data.role ?? "").toUpperCase() !== "STUDENT"
    || [memberships, students, teachers, parents].some((result) => Number(result.count ?? 0) > 0);
  return { shared, reason: shared ? "elima_context" : "revision_only" };
}

async function removePendingUploads(admin, userId) {
  const listed = await admin.storage.from("revision-document-uploads").list(userId, { limit: 1000 });
  if (listed.error) throw apiError(503, "storage_cleanup_failed", "La suppression des documents importés a échoué. Réessaie plus tard.");
  const paths = (listed.data ?? []).filter((item) => item.id).map((item) => `${userId}/${item.name}`);
  if (!paths.length) return;
  const removed = await admin.storage.from("revision-document-uploads").remove(paths);
  if (removed.error) throw apiError(503, "storage_cleanup_failed", "La suppression des documents importés a échoué. Réessaie plus tard.");
}

function bearerToken(request) {
  const value = String(request.headers?.authorization ?? "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
function noSession() { return { persistSession: false, autoRefreshToken: false }; }
function apiError(statusCode, code, message) { return Object.assign(new Error(message), { statusCode, code }); }

export default createHandler();
