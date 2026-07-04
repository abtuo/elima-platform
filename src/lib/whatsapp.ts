import { AzureKeyCredential } from "@azure/core-auth";
import MessageClient, { isUnexpected } from "@azure-rest/communication-messages";
import twilio from "twilio";
import { env, requireServerEnv } from "@/lib/env";

export type WhatsAppSendResult =
  | { ok: true; status: "SENT"; provider: "azure" | "twilio"; messageId?: string; sid?: string }
  | { ok: false; status: "FAILED"; reason: string; provider?: "azure" | "twilio" };

function activeProvider(): "azure" | "twilio" | null {
  if (env.WHATSAPP_PROVIDER === "azure") {
    return env.ACS_ENDPOINT && env.ACS_ACCESS_KEY && env.ACS_WHATSAPP_CHANNEL_ID ? "azure" : null;
  }
  if (env.WHATSAPP_PROVIDER === "twilio") {
    return env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM ? "twilio" : null;
  }
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) return "twilio";
  if (env.ACS_ENDPOINT && env.ACS_ACCESS_KEY && env.ACS_WHATSAPP_CHANNEL_ID) return "azure";
  return null;
}

/** Numéro international E.164 (+225..., +33...). */
export function normalizeWhatsAppPhone(phone: string): string {
  let normalized = phone.trim().replace(/^whatsapp:/i, "").replace(/\s+/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (!normalized.startsWith("+")) {
    throw new Error("Numéro invalide : utilisez le format international (+225..., +33...).");
  }
  return normalized;
}

function azureClient() {
  return MessageClient(requireServerEnv("ACS_ENDPOINT"), new AzureKeyCredential(requireServerEnv("ACS_ACCESS_KEY")));
}

function azureErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "body" in error) {
    return JSON.stringify((error as { body?: unknown }).body);
  }
  return error instanceof Error ? error.message : "Échec envoi Azure WhatsApp";
}

function twilioErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return error instanceof Error ? error.message : "Echec envoi Twilio WhatsApp";
}

export async function sendWhatsAppTemplate(params: {
  to: string;
  templateName: string;
  language: string;
}): Promise<WhatsAppSendResult> {
  const provider = activeProvider();
  if (provider !== "azure") {
    return { ok: false, status: "FAILED", reason: "Templates WhatsApp nécessitent Azure (WHATSAPP_PROVIDER=azure)." };
  }

  try {
    const client = azureClient();
    const to = normalizeWhatsAppPhone(params.to);
    const result = await client.path("/messages/notifications:send").post({
      contentType: "application/json",
      body: {
        channelRegistrationId: requireServerEnv("ACS_WHATSAPP_CHANNEL_ID"),
        to: [to],
        kind: "template",
        template: {
          name: params.templateName,
          language: params.language,
        },
      },
    });

    if (isUnexpected(result)) {
      return { ok: false, status: "FAILED", provider: "azure", reason: azureErrorMessage(result) };
    }

    const messageId = result.body.receipts?.[0]?.messageId;
    return { ok: true, status: "SENT", provider: "azure", messageId };
  } catch (error) {
    return { ok: false, status: "FAILED", provider: "azure", reason: azureErrorMessage(error) };
  }
}

export async function sendWhatsAppWelcome(params: { to: string }): Promise<WhatsAppSendResult> {
  if (activeProvider() === "twilio") {
    return sendWhatsAppMessage({
      to: params.to,
      body: "Bienvenue sur Elima. Votre espace scolaire est pret.",
    });
  }

  const templateName = env.ACS_WHATSAPP_TEMPLATE_WELCOME ?? "welcome";
  const language = env.ACS_WHATSAPP_TEMPLATE_WELCOME_LANG ?? "fr";
  return sendWhatsAppTemplate({ to: params.to, templateName, language });
}

export async function sendWhatsAppMessage(params: { to: string; body: string }): Promise<WhatsAppSendResult> {
  const provider = activeProvider();
  if (!provider) {
    return { ok: false, status: "FAILED", reason: "Aucun fournisseur WhatsApp configuré (Azure ou Twilio)." };
  }

  if (provider === "azure") {
    try {
      const client = azureClient();
      const to = normalizeWhatsAppPhone(params.to);
      const result = await client.path("/messages/notifications:send").post({
        contentType: "application/json",
        body: {
          channelRegistrationId: requireServerEnv("ACS_WHATSAPP_CHANNEL_ID"),
          to: [to],
          kind: "text",
          content: params.body,
        },
      });

      if (isUnexpected(result)) {
        return { ok: false, status: "FAILED", provider: "azure", reason: azureErrorMessage(result) };
      }

      const messageId = result.body.receipts?.[0]?.messageId;
      return { ok: true, status: "SENT", provider: "azure", messageId };
    } catch (error) {
      return { ok: false, status: "FAILED", provider: "azure", reason: azureErrorMessage(error) };
    }
  }

  try {
    const client = twilio(requireServerEnv("TWILIO_ACCOUNT_SID"), requireServerEnv("TWILIO_AUTH_TOKEN"));
    const from = requireServerEnv("TWILIO_WHATSAPP_FROM");
    const to = normalizeWhatsAppPhone(params.to);
    const result = await client.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body: params.body,
    });

    return { ok: true, status: "SENT", provider: "twilio", sid: result.sid };
  } catch (error) {
    return { ok: false, status: "FAILED", provider: "twilio", reason: twilioErrorMessage(error) };
  }
}
