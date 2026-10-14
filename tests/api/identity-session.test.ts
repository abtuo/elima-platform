/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import catchAllHandler from "../../apps/api/api/[...route].mjs";

// Exercise the deployed entrypoint, not an individual legacy API function.
const handler = (request: any, response: any) => catchAllHandler({ url: "/api/elima-session", ...request }, response);

function response() {
  return { statusCode: 200, body: null as any, headers: new Map<string, string>(),
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    getHeader(name: string) { return this.headers.get(name); },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }, end() { return this; } };
}

test("Identity session API: canonical project, rotation, invalid/transient errors and logout", async (t) => {
  const previous = { ...process.env };
  process.env.ELIMA_IDENTITY_URL = "https://nnsgvnjzfrcmbxfwlyow.supabase.co";
  process.env.ELIMA_IDENTITY_PUBLISHABLE_KEY = "test-public-key";
  process.env.SUPABASE_URL = "https://rydnrvvmwixrkmnvpajf.supabase.co";
  process.env.REVISION_ALLOWED_ORIGINS = "https://localhost";
  t.after(() => { process.env = previous; });
  let status = 200;
  let result: any = { access_token: "rotated-access", refresh_token: "rotated-refresh", expires_in: 3600, expires_at: 3700 };
  const calls: { url: string; init: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(status === 204 ? null : JSON.stringify(result), { status });
  });
  const request = { method: "POST", headers: {}, body: { refresh_token: "previous-refresh" } };
  const ok = response(); await handler(request, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.refresh_token, "rotated-refresh");
  assert.equal(ok.headers.get("Cache-Control"), "no-store");
  assert.equal(calls[0].url, "https://nnsgvnjzfrcmbxfwlyow.supabase.co/auth/v1/token?grant_type=refresh_token");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { refresh_token: "previous-refresh" });
  assert.equal((calls[0].init.headers as any).apikey, "test-public-key");

  for (const code of ["refresh_token_not_found", "refresh_token_already_used", "session_not_found"]) {
    status = 400; result = { error_code: code, msg: "sensitive upstream detail" };
    const invalid = response(); await handler(request, invalid);
    assert.equal(invalid.statusCode, 401); assert.equal(invalid.body.code, "invalid_session");
    assert.doesNotMatch(JSON.stringify(invalid.body), /sensitive/);
  }
  status = 401; result = { message: "Invalid API key" };
  const misconfigured = response(); await handler(request, misconfigured);
  assert.equal(misconfigured.statusCode, 503);
  status = 503; const unavailable = response(); await handler(request, unavailable);
  assert.equal(unavailable.statusCode, 503);
  status = 429; const limited = response(); await handler(request, limited);
  assert.equal(limited.statusCode, 429);

  status = 204; const logout = response();
  await handler({ method: "DELETE", headers: { authorization: "Bearer test-access" } }, logout);
  assert.equal(logout.statusCode, 204);
  assert.equal(calls.at(-1)?.url, "https://nnsgvnjzfrcmbxfwlyow.supabase.co/auth/v1/logout?scope=local");
  assert.equal((calls.at(-1)?.init.headers as any).Authorization, "Bearer test-access");

  const preflight = response();
  await handler({ method: "OPTIONS", headers: { origin: "https://localhost", "access-control-request-method": "DELETE", "access-control-request-headers": "Authorization" } }, preflight);
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "https://localhost");

  delete process.env.ELIMA_IDENTITY_URL;
  const count = calls.length;
  const missing = response(); await handler(request, missing);
  assert.equal(missing.statusCode, 503); assert.equal(calls.length, count);
  assert.equal(missing.body.code, "identity_configuration_missing");
});

test("elima-session: catch-all URL/query resolution, methods and Android preflights", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.ELIMA_IDENTITY_URL = "https://nnsgvnjzfrcmbxfwlyow.supabase.co";
  process.env.ELIMA_IDENTITY_PUBLISHABLE_KEY = "test-public-key";
  process.env.REVISION_ALLOWED_ORIGINS = "https://localhost";
  const upstream = t.mock.method(globalThis, "fetch", async () => { throw new Error("No upstream expected"); });
  for (const routing of [
    { url: "/api/elima-session" },
    { url: "/api/elima-session/?source=android" },
    { query: { route: "elima-session" } },
    { query: { route: ["elima-session"] } },
  ]) {
    const result = response();
    await catchAllHandler({ ...routing, method: "POST", headers: {}, body: {} }, result);
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, "invalid_session");
  }
  for (const method of ["POST", "DELETE"]) {
    const result = response();
    await handler({ method: "OPTIONS", headers: { origin: "https://localhost", "access-control-request-method": method, "access-control-request-headers": "Content-Type,Authorization" } }, result);
    assert.equal(result.statusCode, 204);
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), "https://localhost");
  }
  const unsupported = response();
  await handler({ method: "GET", headers: {} }, unsupported);
  assert.equal(unsupported.statusCode, 405);
  assert.equal(upstream.mock.callCount(), 0);
});

test("POST /api/elima-session over local HTTP reaches the unique Vercel entrypoint", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.ELIMA_IDENTITY_URL = "https://nnsgvnjzfrcmbxfwlyow.supabase.co";
  process.env.ELIMA_IDENTITY_PUBLISHABLE_KEY = "test-public-key";
  process.env.REVISION_ALLOWED_ORIGINS = "https://localhost";
  const server = createServer(async (request, outgoing) => {
    const responseAdapter = {
      setHeader: outgoing.setHeader.bind(outgoing),
      getHeader: outgoing.getHeader.bind(outgoing),
      status(code: number) { outgoing.statusCode = code; return this; },
      json(body: unknown) { outgoing.setHeader("Content-Type", "application/json"); outgoing.end(JSON.stringify(body)); return this; },
      end() { outgoing.end(); return this; },
    };
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      await catchAllHandler({ url: request.url, method: request.method, headers: request.headers, body: raw ? JSON.parse(raw) : {} }, responseAdapter);
    } catch {
      outgoing.statusCode = 500;
      outgoing.end();
    }
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/api/elima-session`;
  const result = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://localhost" }, body: "{}" });
  assert.equal(result.status, 401);
  assert.equal((await result.json()).code, "invalid_session");
  assert.equal(result.headers.get("cache-control"), "no-store");
  const preflight = await fetch(url, { method: "OPTIONS", headers: { Origin: "https://localhost", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://localhost");
});
 
