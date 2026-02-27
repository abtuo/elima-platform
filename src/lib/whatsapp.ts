import twilio from "twilio";
import { env, requireServerEnv } from "@/lib/env";

export async function sendWhatsAppMessage(params: { to: string; body: string }) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
    return {
      ok: false,
      status: "FAILED" as const,
      reason: "Twilio not configured",
    };
  }

  const client = twilio(
    requireServerEnv("TWILIO_ACCOUNT_SID"),
    requireServerEnv("TWILIO_AUTH_TOKEN"),
  );

  const result = await client.messages.create({
    from: requireServerEnv("TWILIO_WHATSAPP_FROM"),
    to: params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`,
    body: params.body,
  });

  return {
    ok: true,
    status: "SENT" as const,
    sid: result.sid,
  };
}
