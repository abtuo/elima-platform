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

export const whatsappNotificationSchema = z
  .object({
    schoolId: z.string().uuid(),
    studentId: z.string().uuid().optional(),
    parentPhone: z.string().min(8),
    type: z.enum(["ABSENCE", "REPORT_PUBLISHED", "HIGH_RISK", "WELCOME", "ADMIN_INFO"]),
    message: z.string().min(5).optional(),
    template: z.enum(["welcome"]).optional(),
  })
  .superRefine((data, ctx) => {
    const useWelcome = data.template === "welcome" || data.type === "WELCOME";
    if (!useWelcome && !data.message) {
      ctx.addIssue({
        code: "custom",
        message: "Le champ message est requis hors template welcome.",
        path: ["message"],
      });
    }
  });

export const homeworkInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  dueDate: z.string().date(),
  resourceUrl: z.string().url().max(1000).optional().nullable(),
});

export const lessonLogInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  lessonDate: z.string().date(),
  content: z.string().min(2).max(4000),
  term: z.string().optional().nullable(),
  resourceUrl: z.string().url().max(1000).optional().nullable(),
});

export const feeStructureInputSchema = z.object({
  label: z.string().min(2).max(200),
  level: z.string().max(100).optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  totalAmount: z.number().nonnegative(),
  academicYear: z.string().max(20).optional().nullable(),
  installments: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        dueDate: z.string().date(),
        amount: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export const paymentInputSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["mobile_money", "card", "transfer", "cash"]),
  studentFeeId: z.string().uuid().optional().nullable(),
  installmentId: z.string().uuid().optional().nullable(),
  paidAt: z.string().optional().nullable(),
});
