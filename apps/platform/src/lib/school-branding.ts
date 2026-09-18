const BRANDING_ROUTE = "/api/dashboard/school-branding";
const STORAGE_MARKER = "/storage/v1/object/public/documents/";

export function brandingFileUrl(path: string) {
  return `${BRANDING_ROUTE}?path=${encodeURIComponent(path)}`;
}

export function brandingStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "http://elima.local");
    const path = parsed.searchParams.get("path");
    if (path?.startsWith("branding/")) return path;
  } catch {
    // fall through to legacy public-url parsing
  }

  const markerIndex = url.indexOf(STORAGE_MARKER);
  if (markerIndex >= 0) {
    const path = url.slice(markerIndex + STORAGE_MARKER.length).split(/[?#]/)[0];
    return path.startsWith("branding/") ? decodeURIComponent(path) : null;
  }
  return null;
}

export function normalizeBrandingUrl(url: string | null | undefined) {
  const path = brandingStoragePathFromUrl(url);
  return path ? brandingFileUrl(path) : (url ?? null);
}
