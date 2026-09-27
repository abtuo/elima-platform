import { handleRevisionCors } from "../server/revisionCors.mjs";
import { clientIp, getAuthFlowService, sendAuthFlowError } from "../server/authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    try {
      const result = await resolveService().checkVerification({ phone: request.body?.phone, code: request.body?.code, requestToken: request.body?.requestToken, ip: clientIp(request) });
      return response.status(200).json(result);
    } catch (error) {
      return sendAuthFlowError(response, error, "La vérification est momentanément indisponible. Réessayez dans quelques instants.");
    }
  };
}

export default createHandler();
