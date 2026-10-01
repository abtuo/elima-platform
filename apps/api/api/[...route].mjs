import { resolveApiRoute } from "../server/routes.mjs";

function endpointFromRequest(request) {
  const pathname = new URL(request.url || "/", "https://api.elima.invalid").pathname;
  const match = pathname.match(/^\/api\/([^/]+)\/?$/);
  if (match) {
    try { return decodeURIComponent(match[1]); } catch { return ""; }
  }

  const routeQuery = request.query?.route;
  if (Array.isArray(routeQuery)) return routeQuery.length === 1 ? routeQuery[0] : "";
  return typeof routeQuery === "string" ? routeQuery : "";
}

export default async function handler(request, response) {
  const endpoint = endpointFromRequest(request);
  const route = resolveApiRoute(endpoint);
  if (!route) return response.status(404).json({ message: "Route API introuvable." });

  // Existing handlers retain their exact method checks and CORS contracts.
  return route.handler(request, response);
}

export { endpointFromRequest };
