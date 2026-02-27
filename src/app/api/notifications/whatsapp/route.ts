import { NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { whatsappNotificationSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = whatsappNotificationSchema.parse(json);

    const result = await sendWhatsAppMessage({
      to: payload.parentPhone,
      body: payload.message,
    });

    logEvent(result.ok ? "INFO" : "WARN", "WHATSAPP_NOTIFICATION", {
      type: payload.type,
      schoolId: payload.schoolId,
      studentId: payload.studentId,
      status: result.status,
      providerRef: "sid" in result ? result.sid : undefined,
    });

    return NextResponse.json({ ok: result.ok, notificationStatus: result.status, provider: result });
  } catch (error) {
    logEvent("ERROR", "WHATSAPP_NOTIFICATION_FAILED", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, message: "Invalid payload or provider failure" }, { status: 400 });
  }
}
