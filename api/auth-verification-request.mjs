import { handleRevisionCors } from "../server/revisionCors.mjs";
export default async function handler(request, response) {
  if (handleRevisionCors(request, response, ["POST"])) return;
  if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
  const webBaseUrl = String(process.env.VITE_WEB_BASE_URL || "https://www.elima.ci").replace(/\/+$/, "");
  const upstream = await fetch(`${webBaseUrl}/api/auth/verification/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Elima-Client": "mobile-app" },
    body: JSON.stringify({
      identifier: String(request.body?.identifier ?? "").trim(),
      phone: String(request.body?.phone ?? "").trim(),
    }),
  });
  const body = await upstream.json().catch(() => null);
  return response.status(upstream.status).json(body ?? { message: "Réponse elima.ci invalide." });
}
