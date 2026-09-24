export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function hasPublicSupabaseConfig(input: Partial<PublicSupabaseConfig>): boolean {
  return Boolean(input.url?.trim() && input.publishableKey?.trim());
}

export function parsePublicSupabaseConfig(input: Partial<PublicSupabaseConfig>): PublicSupabaseConfig {
  const url = input.url?.trim() ?? "";
  const publishableKey = input.publishableKey?.trim() ?? "";
  if (!url || !publishableKey) throw new Error("La configuration publique Supabase est incomplète.");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("L'URL publique Supabase est invalide.");
  }
  if (!(["https:", "http:"] as const).includes(parsed.protocol as "https:" | "http:") || parsed.username || parsed.password) {
    throw new Error("L'URL publique Supabase est invalide.");
  }
  return { url: parsed.href.replace(/\/$/, ""), publishableKey };
}
