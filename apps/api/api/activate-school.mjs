export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  const code = String(request.body?.code ?? "");
  if (!token || !code) return response.status(400).json({ message: "Code ou session manquante." });
  const upstream = await fetch("https://www.elima.ci/api/mobile/activate-school", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) });
  const payload = await upstream.json().catch(() => ({ message: "Réponse elima.ci invalide." }));
  return response.status(upstream.status).json(payload);
}
