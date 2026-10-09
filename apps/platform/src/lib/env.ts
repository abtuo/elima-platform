import { z } from "zod";
import {
  assertEnvironmentPair,
  parseAppEnvironment,
} from "@elima/shared-domain/environment";

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
  SUPABASE_DEMO_PROJECT_ID: optionalNonEmptyString(),
  SUPABASE_PRODUCTION_PROJECT_ID: optionalNonEmptyString(),
  ELIMA_APP_MODE: z.enum(["demo", "saas"]).optional(),
  NEXT_PUBLIC_ELIMA_APP_MODE: z.enum(["demo", "saas"]).optional(),
  APP_ENV: z.enum(["production", "staging", "demo", "local"]).optional(),
  TWILIO_ACCOUNT_SID: optionalNonEmptyString(),
  TWILIO_AUTH_TOKEN: optionalNonEmptyString(),
  TWILIO_WHATSAPP_FROM: optionalNonEmptyString(),
  TWILIO_WHATSAPP_AUTH_CONTENT_SID: optionalNonEmptyString(),
  AUTH_OTP_SECRET: optionalNonEmptyString(),
  WHATSAPP_PROVIDER: z.enum(["azure", "twilio"]).optional(),
  ACS_ENDPOINT: optionalNonEmptyString().pipe(z.string().url().optional()),
  ACS_ACCESS_KEY: optionalNonEmptyString(),
  ACS_WHATSAPP_CHANNEL_ID: optionalNonEmptyString(),
  ACS_WHATSAPP_TEMPLATE_WELCOME: optionalNonEmptyString(),
  ACS_WHATSAPP_TEMPLATE_WELCOME_LANG: optionalNonEmptyString(),
  RESEND_API_KEY: optionalNonEmptyString(),
  SENDGRID_API_KEY: optionalNonEmptyString(),
  NOTIFY_EMAIL_TO: optionalNonEmptyString().pipe(z.string().email().default("tuoaboubacar@gmail.com")),
  NOTIFY_EMAIL_FROM: optionalNonEmptyString(),
  OPENAI_API_KEY: optionalNonEmptyString(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);

assertEnvironmentPair(
  parseAppEnvironment(env.APP_ENV),
  env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  env.SUPABASE_DEMO_PROJECT_ID,
  env.SUPABASE_PRODUCTION_PROJECT_ID,
);

export function requireServerEnv<K extends keyof typeof env>(
  key: K,
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
}
