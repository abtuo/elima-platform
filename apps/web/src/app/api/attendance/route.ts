import { NextResponse } from "next/server";
import { attendanceInputSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const payload = attendanceInputSchema.parse(await request.json());

    logEvent("INFO", "ATTENDANCE_RECORDED", {
      schoolId: payload.schoolId,
      classId: payload.classId,
      studentId: payload.studentId,
      date: payload.date,
      status: payload.status,
    });

    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    logEvent("ERROR", "ATTENDANCE_RECORD_FAILED", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, message: "Invalid attendance payload" }, { status: 400 });
  }
}
