import { handleRevisionCors } from "../revisionCors.mjs";
import { getAuthFlowService, sendAuthFlowError } from "../authFlowService.mjs";

export function createHandler(resolveService = getAuthFlowService) {
  return async function handler(request, response) {
    if (handleRevisionCors(request, response, ["POST"])) return;
    if (request.method !== "POST") return response.status(405).json({ message: "Méthode non autorisée." });
    try {
      if (request.body?.role && request.body.role !== "student") return response.status(400).json({ message: "Ce parcours est réservé aux comptes élèves." });
      const service = resolveService();
      const phone = request.body?.phone ?? request.body?.verificationPhone ?? request.body?.identifier;
      let authorization = request.body?.authorization;
      if (!authorization && request.body?.verificationId && request.body?.verificationCode) {
        const verified = await service.checkVerification({ phone, code: request.body.verificationCode, requestToken: request.body.verificationId });
        if (verified.accountExists || verified.purpose !== "signup" || !verified.authorization) return response.status(409).json({ message: "Ce numéro est déjà associé à un compte Elima." });
        authorization = verified.authorization;
      }
      const result = await service.signup({
        phone,
        authorization,
        firstName: request.body?.firstName,
        lastName: request.body?.lastName,
        password: request.body?.password,
        schoolLevel: request.body?.schoolLevel,
        declaredSchoolName: request.body?.declaredSchoolName,
        declaredSchoolCity: request.body?.declaredSchoolCity,
      });
      return response.status(201).json(result);
    } catch (error) {
      return sendAuthFlowError(response, error, "Inscription momentanément indisponible.");
    }
  };
}

export default createHandler();
