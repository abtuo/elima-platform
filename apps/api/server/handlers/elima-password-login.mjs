import { handleRevisionCors } from "../revisionCors.mjs";
import { resolveIdentityPublicConfig } from "../identityAuth.mjs";
function normalizeIdentifier(value) {
  const identifier = String(value ?? "").trim().toLowerCase();
  if (identifier.includes("@")) return identifier;
  const phone = identifier.replace(/[\s\-().]/g, "");
  return phone ? `${phone}@phone.elima` : "";
}

export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  let identityConfig;
  try {
    identityConfig = resolveIdentityPublicConfig();
  } catch {
    return response.status(503).json({ message: "Configuration du service d’identité incomplète." });
  }
  const { url: identityUrl, publishableKey } = identityConfig;
  const email = normalizeIdentifier(request.body?.identifier);
  const password = String(request.body?.password ?? "");
  const recentSignup = request.body?.recentSignup === true;
  if (!email || !password) return response.status(400).json({ message: "Numéro WhatsApp et mot de passe requis." });

  let upstream;
  let body;
  const delays = recentSignup ? [0, 350, 900] : [0];
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    upstream = await fetch(`${identityUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: publishableKey },
      body: JSON.stringify({ email, password }),
    });
    body = await upstream.json().catch(() => null);
    if (upstream.ok && body?.access_token) break;
    if (!isInvalidCredentials(body)) break;
  }

  if (!upstream?.ok || !body?.access_token) {
    const errorText = String(body?.message ?? body?.msg ?? body?.error_description ?? body?.error ?? "").toLowerCase();
    if (/api key|apikey|jwt|project/.test(errorText)) {
      return response.status(500).json({ message: "La clé publique du projet d’identité Elima est invalide sur Vercel." });
    }
    if (/email.*confirm|confirm.*email/.test(errorText)) {
      return response.status(403).json({ message: "Ce compte existe, mais son activation n’est pas terminée." });
    }
    if (upstream?.status === 429) {
      return response.status(429).json({ message: "Trop de tentatives. Réessaie dans quelques instants." });
    }
    return response.status(401).json({ message: "Numéro WhatsApp ou mot de passe incorrect." });
  }
  return response.status(200).json({ access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in });
}

function isInvalidCredentials(body) {
  const value = String(body?.error_code ?? body?.code ?? body?.message ?? body?.msg ?? "").toLowerCase();
  return value.includes("invalid_credentials") || value.includes("invalid login credentials");
}
