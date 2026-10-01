import { handleRevisionCors } from "../revisionCors.mjs";
import { clientIp, getAuthFlowService, sendAuthFlowError } from "../authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    try {
      const result = await resolveService().requestVerification({ phone: request.body?.phone, purpose: request.body?.purpose === "password_reset" ? "password_reset" : "signup", ip: clientIp(request) });
      return response.status(200).json({ ...result, challengeId: result.requestToken });
    } catch (error) {
      return sendAuthFlowError(response, error, "Nous n’avons pas pu envoyer le code pour le moment. Réessayez dans quelques instants.");
    }
  };
}

export default createHandler();
