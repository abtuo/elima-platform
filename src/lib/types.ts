export type AppRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "COMPTABLE"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/** Statuts de paiement (finance). "partial" et "late" complètent le modèle. */
export type PaymentStatus = "paid" | "partial" | "pending" | "late";

/** Moyens de paiement, conçus pour accueillir Mobile Money / carte / virement. */
export type PaymentMethod = "mobile_money" | "card" | "transfer" | "cash";

export interface Homework {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  resourceUrl?: string | null;
  createdAt?: string;
}

export interface LessonLog {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId?: string | null;
  lessonDate: string;
  content: string;
  termId?: string | null;
  createdAt?: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  label: string;
  level?: string | null;
  classId?: string | null;
  totalAmount: number;
  academicYear?: string | null;
}

export interface FeeInstallment {
  id: string;
  feeStructureId: string;
  label: string;
  dueDate: string;
  amount: number;
}

export interface StudentFee {
  id: string;
  studentId: string;
  schoolId: string;
  feeStructureId?: string | null;
  amountDue: number;
}

export interface Payment {
  id: string;
  studentId: string;
  schoolId: string;
  studentFeeId?: string | null;
  installmentId?: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string | null;
  receiptNo?: string | null;
  createdAt?: string;
}

export type AnalyticsAlertType =
  | "ACADEMIC_DECLINE"
  | "HIGH_ABSENCE"
  | "ACADEMIC_AND_FINANCIAL"
  | "UNPAID"
  | "CLASS_ATTENTION";

export interface AnalyticsAlert {
  id: string;
  type: AnalyticsAlertType;
  severity: RiskLevel;
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  className?: string;
  recommendation?: string;
}

export interface School {
  id: string;
  name: string;
  country: string;
  city?: string;
}

export interface Student {
  id: string;
  fullName: string;
  className: string;
  average: number;
  attendanceRate: number;
}

export interface AcademicMetric {
  studentId: string;
  averageScore: number;
  attendanceRate: number;
  performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
  riskLevel: RiskLevel;
  alertFlag: boolean;
}

export interface ReportSubjectRow {
  subject: string;
  teacher?: string;
  coefficient?: number;
  score?: number;
  classMin?: number;
  classMax?: number;
  classAvg?: number;
  termScores: Record<string, number | undefined>;
  yearScore?: number;
  appreciation?: string;
}

export interface SchoolIdentity {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  site?: string;
  city?: string;
  country?: string;
}
