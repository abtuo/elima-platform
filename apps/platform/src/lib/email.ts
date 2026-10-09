import { Resend } from "resend";
import { env, requireServerEnv } from "@/lib/env";

export async function sendNotificationEmail({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string;
  text?: string;
}) {
  if (env.SENDGRID_API_KEY) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: requireServerEnv("NOTIFY_EMAIL_TO") }] }],
        from: { email: requireServerEnv("NOTIFY_EMAIL_FROM") },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`SendGrid email error (${response.status}): ${await response.text()}`);
    }
    return { id: response.headers.get("x-message-id") };
  }
  const resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  const result = await resend.emails.send({
    from: requireServerEnv("NOTIFY_EMAIL_FROM"),
    to: [requireServerEnv("NOTIFY_EMAIL_TO")],
    subject,
    html,
    text,
  });
  if (result.error) throw new Error(`Resend email error: ${result.error.message}`);
  return result;
}
