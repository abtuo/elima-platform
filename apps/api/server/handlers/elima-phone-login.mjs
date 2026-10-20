import { handleRevisionCors } from "../revisionCors.mjs";
import { getAuthFlowService, sendAuthFlowError } from "../authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    try {
      const result = await resolveService().loginWithPhoneControl({
        phone: request.body?.phone,
        authorization: request.body?.authorization,
      });
      return response.status(200).json(result);
    } catch (error) {
      return sendAuthFlowError(response, error, "Connexion momentanément indisponible.");
    }
  };
}

export default createHandler();
