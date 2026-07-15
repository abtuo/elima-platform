export default async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ message: "Méthode non autorisée." });
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return response.status(401).json({ message: "Session Elima manquante." });
  const upstream = await fetch("https://www.elima.ci/api/mobile/me", { headers: { Authorization: `Bearer ${token}` } });
  const payload = await upstream.json().catch(() => ({ message: "Réponse elima.ci invalide." }));
  return response.status(upstream.status).json(payload);
}
