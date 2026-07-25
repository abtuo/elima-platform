import { Resend } from "resend";
import { requireServerEnv } from "@/lib/env";

export async function sendNotificationEmail({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string;
  text?: string;
}) {
  const resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  return resend.emails.send({
    from: requireServerEnv("NOTIFY_EMAIL_FROM"),
    to: [requireServerEnv("NOTIFY_EMAIL_TO")],
    subject,
    html,
    text,
  });
}
