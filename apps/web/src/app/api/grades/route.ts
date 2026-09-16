import { NextResponse } from "next/server";
import { gradeInputSchema } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const payload = gradeInputSchema.parse(await request.json());

    logEvent("INFO", "GRADE_RECORDED", {
      schoolId: payload.schoolId,
      evaluationId: payload.evaluationId,
      studentId: payload.studentId,
      score: payload.score,
    });

    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    logEvent("ERROR", "GRADE_RECORD_FAILED", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, message: "Invalid grade payload" }, { status: 400 });
  }
}
