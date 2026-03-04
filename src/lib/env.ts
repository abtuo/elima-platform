import { z } from "zod";

function optionalNonEmptyString() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().min(1).optional(),
  );
}

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalNonEmptyString().pipe(z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString(),
  TWILIO_ACCOUNT_SID: optionalNonEmptyString(),
  TWILIO_AUTH_TOKEN: optionalNonEmptyString(),
  TWILIO_WHATSAPP_FROM: optionalNonEmptyString(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

export function requireServerEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
}
