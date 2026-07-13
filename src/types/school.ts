export type ChildSummary = {
  id: string;
  name: string;
  className: string;
  recentGrade: string;
  absences: number;
  pendingAssignments: number;
};

export type Assignment = {
  id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  status: "pending" | "done" | "late";
  resourceUrl?: string;
};

export type GradeSummary = {
  id: string;
  subject: string;
  title: string;
  score: number;
  maxScore: number;
  date: string;
};

export type MessagePreview = {
  id: string;
  subject: string;
  preview: string;
  sender: string;
  date: string;
  read: boolean;
};

export type PaymentSummary = {
  id: string;
  label: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  description?: string;
  type: "cours" | "exercice" | "correction" | "devoir" | "ressource";
  subject: string;
  className: string;
  url?: string;
  publishedAt: string;
};

export type AttendanceRecord = {
  studentId: string;
  studentName: string;
  status: "PRESENT" | "ABSENT" | "LATE";
};

export type ClassInfo = {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
  time?: string;
};

export type StudentDirectoryItem = {
  id: string;
  name: string;
  className: string;
  registrationNumber?: string;
  photoUrl?: string;
};

export type TeacherDirectoryItem = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  classes: string[];
};

export type SubjectOption = { id: string; name: string };

export type SupplyListSummary = {
  id: string;
  title: string;
  className: string;
  academicYear: string;
  status: "draft" | "pending_validation" | "published";
  itemCount: number;
};

export type StoreOrderSummary = {
  id: string;
  studentName: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

export type TimetableEvent = {
  id: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  room?: string;
};

export type AdminTrendPoint = {
  label: string;
  attendance: number;
  payments: number;
};
