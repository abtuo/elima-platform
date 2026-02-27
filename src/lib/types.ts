export type AppRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

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
  score: number; // /20
  classMin?: number;
  classMax?: number;
  classAvg?: number;
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
