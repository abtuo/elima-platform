import { NextResponse } from "next/server";
import { sendWhatsAppMessage, sendWhatsAppWelcome } from "@/lib/whatsapp";
import { whatsappNotificationSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logger";
import { isDemoMode } from "@/lib/app-mode";
import { checkSchoolFeature } from "@/lib/plans-server";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = whatsappNotificationSchema.parse(json);

    const planErr = await checkSchoolFeature(payload.schoolId, "whatsapp_reminders");
    if (planErr) return planErr;

    if (isDemoMode()) {
      logEvent("INFO", "WHATSAPP_NOTIFICATION_DEMO_SIMULATED", {
        type: payload.type,
        schoolId: payload.schoolId,
        studentId: payload.studentId,
      });
      return NextResponse.json({
        ok: true,
        notificationStatus: "SENT",
        provider: "demo",
        messageId: `demo-${Date.now()}`,
      });
    }

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
