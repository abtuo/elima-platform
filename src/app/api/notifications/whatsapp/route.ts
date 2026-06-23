import { NextResponse } from "next/server";
import { sendWhatsAppMessage, sendWhatsAppWelcome } from "@/lib/whatsapp";
import { whatsappNotificationSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = whatsappNotificationSchema.parse(json);

    const useWelcomeTemplate = payload.template === "welcome" || payload.type === "WELCOME";
    const result = useWelcomeTemplate
      ? await sendWhatsAppWelcome({ to: payload.parentPhone })
      : await sendWhatsAppMessage({
          to: payload.parentPhone,
          body: payload.message!,
        });

    logEvent(result.ok ? "INFO" : "WARN", "WHATSAPP_NOTIFICATION", {
      type: payload.type,
      schoolId: payload.schoolId,
      studentId: payload.studentId,
      status: result.status,
      provider: "provider" in result ? result.provider : undefined,
      providerRef:
        result.ok && "messageId" in result && result.messageId
          ? result.messageId
          : result.ok && "sid" in result
            ? result.sid
            : undefined,
      template: useWelcomeTemplate ? "welcome" : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.reason, provider: result.provider }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      notificationStatus: result.status,
      provider: result.provider,
      messageId: result.messageId ?? result.sid,
    });
  } catch (error) {
    logEvent("ERROR", "WHATSAPP_NOTIFICATION_FAILED", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Invalid payload or provider failure" },
      { status: 400 },
    );
  }
}
