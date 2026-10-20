import "server-only";

export function getElimaApiBaseUrl(): string | null {
  const value = process.env.ELIMA_API_BASE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const localDevelopment = process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((!localDevelopment && url.protocol !== "https:") || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function callElimaApi(path: string, body: unknown): Promise<Response> {
  const baseUrl = getElimaApiBaseUrl();
  if (!baseUrl) throw new Error("ELIMA_API_NOT_CONFIGURED");
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}
