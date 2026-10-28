import { handleRevisionCors } from "../revisionCors.mjs";
import { applyRevisionApiError, authorizeRevisionRequest } from "../revisionAiQuota.mjs";
import { checkQuizAnswer, createCatalogQuizAttempt, submitQuizAttempt } from "../revisionQuizAttempts.mjs";

export function createHandler(dependencies = {}) {
  const authorize = dependencies.authorize ?? authorizeRevisionRequest;
  const start = dependencies.start ?? createCatalogQuizAttempt;
  const answer = dependencies.answer ?? checkQuizAnswer;
  const submit = dependencies.submit ?? submitQuizAttempt;
  return async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ code: "method_not_allowed", message: "Méthode non autorisée." });
    try {
      const { admin, user } = await authorize(request);
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body ?? {};
      if (body.action === "start") return response.status(201).json(await start(admin, user.id, body));
      if (body.action === "answer") return response.status(200).json(await answer(admin, user.id, body));
      if (body.action === "submit") return response.status(200).json(await submit(admin, user.id, body));
      return response.status(400).json({ code: "invalid_action", message: "Action inconnue." });
    } catch (error) {
      return applyRevisionApiError(response, error, "Le quiz est momentanément indisponible.");
    }
  };
}

export default createHandler();
