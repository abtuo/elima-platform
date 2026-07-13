import { env } from "./env";

export function getWebUrl(path = "") {
  const base = env.webBaseUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${base}${suffix}`;
}

export function openWebPath(path: string) {
  window.open(getWebUrl(path), "_blank", "noopener,noreferrer");
}
