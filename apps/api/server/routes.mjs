import accountDelete from "./handlers/account-delete.mjs";
import revisionSubscription from "./handlers/revision-subscription.mjs";
import googlePlayRtdn from "./handlers/google-play-rtdn.mjs";
import activateSchool from "./handlers/activate-school.mjs";
import authPasswordReset from "./handlers/auth-password-reset.mjs";
import authVerificationCheck from "./handlers/auth-verification-check.mjs";
import authVerificationRequest from "./handlers/auth-verification-request.mjs";
import elimaPasswordLogin from "./handlers/elima-password-login.mjs";
import elimaSession from "./handlers/elima-session.mjs";
import elimaProfile from "./handlers/elima-profile.mjs";
import elimaSignup from "./handlers/elima-signup.mjs";
import identityBridge from "./handlers/identity-bridge.mjs";
import learning from "./handlers/learning.mjs";
import registrationRequest from "./handlers/registration-request.mjs";
import revisionDocumentAnalyze from "./handlers/revision-document-analyze.mjs";
import revisionDocumentDelete from "./handlers/revision-document-delete.mjs";
import revisionGenerate from "./handlers/revision-generate.mjs";

const POST = ["POST"];

export const API_ROUTES = new Map([
  ["revision-subscription", { methods: ["GET", "POST"], handler: revisionSubscription }],
  ["google-play-rtdn", { methods: ["POST"], handler: googlePlayRtdn }],
  ["account-delete", { methods: POST, handler: accountDelete }],
  ["activate-school", { methods: POST, handler: activateSchool }],
  ["auth-password-reset", { methods: POST, handler: authPasswordReset }],
  ["auth-verification-check", { methods: POST, handler: authVerificationCheck }],
  ["auth-verification-request", { methods: POST, handler: authVerificationRequest }],
  ["elima-password-login", { methods: POST, handler: elimaPasswordLogin }],
  ["elima-session", { methods: ["POST", "DELETE"], handler: elimaSession }],
  ["elima-profile", { methods: ["GET"], handler: elimaProfile }],
  ["elima-signup", { methods: POST, handler: elimaSignup }],
  ["identity-bridge", { methods: POST, handler: identityBridge }],
  ["learning", { methods: POST, handler: learning }],
  ["registration-request", { methods: POST, handler: registrationRequest }],
  ["revision-generate", { methods: POST, handler: revisionGenerate }],
  ["revision-document-analyze", { methods: POST, handler: revisionDocumentAnalyze }],
  ["revision-document-delete", { methods: POST, handler: revisionDocumentDelete }],
]);

export const API_ENDPOINTS = [...API_ROUTES.keys()];

export const REVISION_API_ENDPOINTS = [
  "revision-subscription",
  "account-delete",
  "identity-bridge",
  "elima-profile",
  "elima-password-login",
  "elima-session",
  "elima-signup",
  "auth-verification-check",
  "auth-verification-request",
  "auth-password-reset",
  "learning",
  "revision-generate",
  "revision-document-analyze",
  "revision-document-delete",
];

export function resolveApiRoute(endpoint) {
  return API_ROUTES.get(String(endpoint ?? "")) ?? null;
}
