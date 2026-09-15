import { handleRevisionCors } from "../server/revisionCors.mjs";
function normalizeIdentifier(value) {
  const identifier = String(value ?? "").trim().toLowerCase();
  if (identifier.includes("@")) return identifier;
  const phone = identifier.replace(/[\s\-().]/g, "");
  return phone ? `${phone}@phone.elima` : "";
}

export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const identityUrl = String(process.env.VITE_ELIMA_IDENTITY_URL ?? "").replace(/\/+$/, "");
  const publishableKey = process.env.ELIMA_IDENTITY_PUBLISHABLE_KEY || process.env.VITE_ELIMA_IDENTITY_PUBLISHABLE_KEY;
  const email = normalizeIdentifier(request.body?.identifier);
  const password = String(request.body?.password ?? "");
  const recentSignup = request.body?.recentSignup === true;
  if (!identityUrl || !publishableKey) return response.status(500).json({ message: "Connexion Elima non configurée." });
  if (!email || !password) return response.status(400).json({ message: "Email ou téléphone et mot de passe requis." });

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
    return response.status(401).json({ message: "Email, téléphone ou mot de passe incorrect." });
  }
  return response.status(200).json({ access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in });
}

function isInvalidCredentials(body) {
  const value = String(body?.error_code ?? body?.code ?? body?.message ?? body?.msg ?? "").toLowerCase();
  return value.includes("invalid_credentials") || value.includes("invalid login credentials");
}
