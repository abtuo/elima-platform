import { handleRevisionCors } from "../revisionCors.mjs";
import { clientIp, getAuthFlowService, sendAuthFlowError } from "../authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    const action = String(request.body?.action ?? "");
    try {
      if (action === "request") {
        const result = await resolveService().requestVerification({ phone: request.body?.phone, purpose: "password_reset", ip: clientIp(request) });
        return response.status(200).json({ ...result, challengeId: result.requestToken });
      }
      if (action === "authorize") {
        const result = await resolveService().exchangePhoneControl({ phone: request.body?.phone, authorization: request.body?.authorization });
        return response.status(200).json(result);
      }
      if (action === "confirm") {
        const service = resolveService();
        const phone = request.body?.phone ?? request.body?.identifier;
        let authorization = request.body?.authorization;
        if (!authorization && request.body?.challengeId && request.body?.code) {
          const verified = await service.checkVerification({ phone, code: request.body.code, requestToken: request.body.challengeId, ip: clientIp(request) });
          if (!verified.accountExists || verified.purpose !== "password_reset" || !verified.authorization) return response.status(400).json({ message: "Compte Elima introuvable." });
          authorization = verified.authorization;
        }
        const result = await service.resetPassword({ phone, authorization, password: request.body?.password, ip: clientIp(request) });
        return response.status(200).json(result);
      }
      return response.status(400).json({ message: "Action de réinitialisation invalide." });
    } catch (error) {
      return sendAuthFlowError(response, error, "Réinitialisation momentanément indisponible.");
    }
  };
}

export default createHandler();
