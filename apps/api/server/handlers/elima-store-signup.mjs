import { handleRevisionCors } from "../revisionCors.mjs";
import { getAuthFlowService, sendAuthFlowError } from "../authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    try {
      const result = await resolveService().signupCustomer({
        phone: request.body?.phone,
        authorization: request.body?.authorization,
        firstName: request.body?.firstName,
        lastName: request.body?.lastName,
        password: request.body?.password,
      });
      return response.status(201).json(result);
    } catch (error) {
      return sendAuthFlowError(response, error, "Inscription momentanément indisponible.");
    }
  };
}

export default createHandler();
