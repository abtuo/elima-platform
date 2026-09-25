import { createServer } from "node:http";
import { API_ENDPOINTS } from "./routes.mjs";

const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || "127.0.0.1";
const handlers = new Map(await Promise.all(API_ENDPOINTS.map(async (endpoint) => {
  const { default: handler } = await import(new URL(`../api/${endpoint}.mjs`, import.meta.url));
  return [endpoint, handler];
})));

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`).pathname;
  const match = pathname.match(/^\/api\/([^/]+)\/?$/);
  const endpoint = match?.[1];
  const handler = endpoint ? handlers.get(endpoint) : undefined;
  if (!handler) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ message: "Route API introuvable." }));
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const rawBody = Buffer.concat(chunks).toString("utf8");
    request.body = endpoint === "revision-generate" ? rawBody : rawBody ? JSON.parse(rawBody) : {};
    response.status = (statusCode) => { response.statusCode = statusCode; return response; };
    response.json = (payload) => {
      if (!response.hasHeader("Content-Type")) response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify(payload));
      return response;
    };
    await handler(request, response);
  } catch (error) {
    if (response.headersSent) return response.end();
    response.statusCode = error instanceof SyntaxError ? 400 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ message: error instanceof SyntaxError ? "Payload JSON invalide." : "Erreur serveur locale." }));
    console.error(error);
  }
});

server.listen(port, host, () => console.log(`@elima/api écoute sur http://${host}:${port}`));
