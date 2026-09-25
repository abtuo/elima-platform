const ALLOWED_HEADERS = ["Content-Type", "Authorization"];

function validOrigin(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch { return null; }
}

/** Returns true when the response is complete. Never replaces authentication. */
export function handleRevisionCors(request, response, methods, configuredOrigins = process.env.REVISION_ALLOWED_ORIGINS ?? "") {
  const vary = String(response.getHeader?.("Vary") ?? "").split(",").map(value => value.trim()).filter(Boolean);
  if (!vary.some(value => value.toLowerCase() === "origin")) vary.push("Origin");
  response.setHeader("Vary", vary.join(", "));

  const origin = request.headers.origin;
  const allowedOrigins = configuredOrigins.split(",").map(value => validOrigin(value.trim())).filter(Boolean);
  // Host is the receiving server's Host, not an arbitrary forwarded hostname.
  const protocol = request.socket?.encrypted ? "https" : String(request.headers["x-forwarded-proto"] ?? "http").split(",")[0].trim();
  const ownOrigin = validOrigin(`${protocol}://${request.headers.host}`);
  const allowed = typeof origin === "string" && validOrigin(origin) === origin && (allowedOrigins.includes(origin) || origin === ownOrigin);

  if (origin && !allowed) {
    response.status(403).json({ message: "Origine non autorisée." });
    return true;
  }
  if (allowed) response.setHeader("Access-Control-Allow-Origin", origin);
  if (request.method !== "OPTIONS") return false;
  if (!allowed) {
    response.status(403).json({ message: "Origine preflight manquante ou non autorisée." });
    return true;
  }
  const requestedMethod = request.headers["access-control-request-method"];
  if (!methods.includes(requestedMethod)) {
    response.status(405).json({ message: "Méthode preflight non autorisée." });
    return true;
  }
  const requestedHeaders = String(request.headers["access-control-request-headers"] ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (requestedHeaders.some(value => !ALLOWED_HEADERS.some(header => header.toLowerCase() === value))) {
    response.status(400).json({ message: "Header preflight non autorisé." });
    return true;
  }
  response.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
  response.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  response.status(204).end();
  return true;
}
