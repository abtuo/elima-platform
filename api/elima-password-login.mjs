function normalizeIdentifier(value) {
  const identifier = String(value ?? "").trim().toLowerCase();
  if (identifier.includes("@")) return identifier;
  const phone = identifier.replace(/[\s\-().]/g, "");
  return phone ? `${phone}@phone.elima` : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const identityUrl = String(process.env.VITE_ELIMA_IDENTITY_URL ?? "").replace(/\/+$/, "");
  const publishableKey = process.env.ELIMA_IDENTITY_PUBLISHABLE_KEY || process.env.VITE_ELIMA_IDENTITY_PUBLISHABLE_KEY;
  const email = normalizeIdentifier(request.body?.identifier);
  const password = String(request.body?.password ?? "");
  if (!identityUrl || !publishableKey) return response.status(500).json({ message: "Connexion Elima non configurée." });
  if (!email || !password) return response.status(400).json({ message: "Email ou téléphone et mot de passe requis." });

  const upstream = await fetch(`${identityUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: publishableKey },
    body: JSON.stringify({ email, password }),
  });
  const body = await upstream.json().catch(() => null);
  if (!upstream.ok || !body?.access_token) return response.status(401).json({ message: "Email, téléphone ou mot de passe incorrect." });
  return response.status(200).json({ access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in });
}
