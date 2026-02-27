import { z } from "zod";

export const attendanceInputSchema = z.object({
  schoolId: z.string().uuid(),
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  date: z.string().date(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});

export const gradeInputSchema = z.object({
  schoolId: z.string().uuid(),
  evaluationId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.number().min(0).max(20),
});

export const whatsappNotificationSchema = z.object({
  schoolId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  parentPhone: z.string().min(8),
  type: z.enum(["ABSENCE", "REPORT_PUBLISHED", "HIGH_RISK"]),
  message: z.string().min(5),
});
