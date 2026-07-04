import { NextResponse } from "next/server";
import { createSupabaseAdminServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined, column: string) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  return code === "PGRST204" || (msg.includes(column) && /column|schema cache|does not exist/i.test(msg));
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  return code === "42P01" || code === "PGRST205" || /Could not find the table|does not exist/i.test(msg);
}

function moneyValue(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function studentProfilePhotoUrl(studentId: string, storedPhotoUrl?: string | null) {
  if (storedPhotoUrl) return storedPhotoUrl;
  const seed = Array.from(studentId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `/student_profil_${(seed % 5) + 1}.png`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classIdFilter = url.searchParams.get("classId")?.trim() ?? "";
    const studentIdFilter = (url.searchParams.get("studentId") ?? url.searchParams.get("student") ?? "").trim();

    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminServerClient();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ message: authErr.message }, { status: 401 });
    const userId = authData.user?.id;
    if (!userId) return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 });

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) return NextResponse.json({ message: userErr.message }, { status: 400 });
    if (!userRow?.school_id) return NextResponse.json({ classes: [], students: [] });

    const schoolId = String(userRow.school_id);

    if (studentIdFilter) {
      let studentResult = await admin
        .from("students")
        .select(
          `id, full_name, photo_url, registration_number, birth_date, class_id,
           class:classes!students_class_id_fkey(id, name, level, academic_year)`,
        )
        .eq("id", studentIdFilter)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (studentResult.error && isMissingColumnError(studentResult.error, "photo_url")) {
        studentResult = await admin
          .from("students")
          .select(
            `id, full_name, registration_number, birth_date, class_id,
             class:classes!students_class_id_fkey(id, name, level, academic_year)`,
          )
          .eq("id", studentIdFilter)
          .eq("school_id", schoolId)
          .maybeSingle();
      }
      if (studentResult.error) return NextResponse.json({ message: studentResult.error.message }, { status: 400 });
      if (!studentResult.data) return NextResponse.json({ message: "Eleve introuvable" }, { status: 404 });

      const studentRow = studentResult.data as unknown as {
        id: string;
        full_name: string;
        photo_url?: string | null;
        registration_number: string | null;
        birth_date: string | null;
        class_id: string;
        class: { id: string; name: string; level: string; academic_year: string } | Array<{ id: string; name: string; level: string; academic_year: string }> | null;
      };
      const studentClass = pickOne(studentRow.class);

      const [gradesRes, attendanceRes, reportsRes, metricsRes, feesRes, paymentsRes, legacyPaymentsRes] = await Promise.all([
        admin
          .from("grades")
          .select(
            `id, score, comment, created_at,
             evaluation:evaluations!grades_evaluation_id_fkey(
               id, title, max_score, coefficient, evaluation_date,
               subject:subjects!evaluations_subject_id_fkey(name)
             )`,
          )
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("created_at", { ascending: false }),
        admin
          .from("attendance")
          .select("id, status, reason, date, created_at")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("date", { ascending: false })
          .limit(60),
        admin
          .from("reports")
          .select("id, term, average_score, attendance_rate, pdf_url, created_at")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("created_at", { ascending: false }),
        admin
          .from("academic_metrics")
          .select("average_score, attendance_rate, performance_trend, risk_level, alert_flag, computed_at")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("computed_at", { ascending: false })
          .limit(1),
        admin
          .from("student_fees")
          .select("amount_due")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter),
        admin
          .from("payments")
          .select("id, amount, method, status, receipt_no, paid_at, created_at")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("created_at", { ascending: false }),
        admin
          .from("student_payments")
          .select("id, amount, type, provider, status, created_at")
          .eq("school_id", schoolId)
          .eq("student_id", studentIdFilter)
          .order("created_at", { ascending: false }),
      ]);

      const firstError = [gradesRes, attendanceRes, reportsRes, metricsRes, feesRes, paymentsRes].find((res) => res.error)?.error;
      if (firstError) return NextResponse.json({ message: firstError.message }, { status: 400 });
      if (legacyPaymentsRes.error && !isMissingRelationError(legacyPaymentsRes.error)) {
        return NextResponse.json({ message: legacyPaymentsRes.error.message }, { status: 400 });
      }

      const grades = ((gradesRes.data ?? []) as Array<{
        id: string;
        score: number | string;
        comment: string | null;
        created_at: string;
        evaluation?: {
          id: string;
          title: string;
          max_score: number | string;
          coefficient: number | string;
          evaluation_date: string;
          subject?: { name: string } | Array<{ name: string }> | null;
        } | Array<{
          id: string;
          title: string;
          max_score: number | string;
          coefficient: number | string;
          evaluation_date: string;
          subject?: { name: string } | Array<{ name: string }> | null;
        }> | null;
      }>).map((grade) => {
        const evaluation = pickOne(grade.evaluation);
        const subject = pickOne(evaluation?.subject);
        return {
          id: String(grade.id),
          score: moneyValue(grade.score),
          maxScore: moneyValue(evaluation?.max_score ?? 20),
          coefficient: moneyValue(evaluation?.coefficient ?? 1),
          comment: grade.comment ? String(grade.comment) : null,
          createdAt: String(grade.created_at),
          evaluationId: evaluation?.id ? String(evaluation.id) : null,
          evaluationTitle: String(evaluation?.title ?? "Evaluation"),
          evaluationDate: evaluation?.evaluation_date ? String(evaluation.evaluation_date) : null,
          subjectName: String(subject?.name ?? "Matiere"),
          teacherName: null,
        };
      });

      const weightedTotal = grades.reduce((acc, grade) => acc + (grade.score / Math.max(grade.maxScore, 1)) * 20 * Math.max(grade.coefficient, 0), 0);
      const coefficientTotal = grades.reduce((acc, grade) => acc + Math.max(grade.coefficient, 0), 0);
      const average = coefficientTotal > 0 ? Math.round((weightedTotal / coefficientTotal) * 10) / 10 : null;

      const attendance = ((attendanceRes.data ?? []) as Array<{
        id: string;
        status: string;
        reason: string | null;
        date: string;
        created_at: string;
      }>).map((row) => ({
        id: String(row.id),
        status: String(row.status),
        reason: row.reason ? String(row.reason) : null,
        date: String(row.date),
        createdAt: String(row.created_at),
      }));

      const attendanceTotal = attendance.length;
      const attendancePresent = attendance.filter((row) => row.status === "PRESENT").length;
      const attendanceLate = attendance.filter((row) => row.status === "LATE").length;
      const attendanceAbsent = attendance.filter((row) => row.status === "ABSENT").length;

      const reports = ((reportsRes.data ?? []) as Array<{
        id: string;
        term: string;
        average_score: number | string;
        attendance_rate: number | string;
        pdf_url: string | null;
        created_at: string;
      }>).map((report) => ({
        id: String(report.id),
        term: String(report.term),
        averageScore: moneyValue(report.average_score),
        attendanceRate: moneyValue(report.attendance_rate),
        pdfUrl: report.pdf_url ? String(report.pdf_url) : null,
        createdAt: String(report.created_at),
      }));

      let payments: Array<{
        id: string;
        amount: number;
        method: string;
        status: string;
        receiptNo: string | null;
        paidAt: string;
        label?: string | null;
        receiptHref: string | null;
      }> = ((paymentsRes.data ?? []) as Array<{
        id: string;
        amount: number | string;
        method: string;
        status: string;
        receipt_no: string | null;
        paid_at: string | null;
        created_at: string;
      }>).map((payment) => ({
        id: String(payment.id),
        amount: moneyValue(payment.amount),
        method: String(payment.method),
        status: String(payment.status),
        receiptNo: payment.receipt_no ? String(payment.receipt_no) : null,
        paidAt: payment.paid_at ? String(payment.paid_at) : String(payment.created_at),
        receiptHref: `/api/finance/receipt/${payment.id}`,
      }));

      let totalDue = ((feesRes.data ?? []) as Array<{ amount_due: number | string }>).reduce(
        (sum, row) => sum + moneyValue(row.amount_due),
        0,
      );
      let totalPaid = payments
        .filter((payment) => payment.status === "paid" || payment.status === "partial")
        .reduce((sum, payment) => sum + payment.amount, 0);

      if (totalDue <= 0 && payments.length === 0 && !legacyPaymentsRes.error) {
        const legacyPayments = ((legacyPaymentsRes.data ?? []) as Array<{
          id: string;
          amount: number | string;
          type: string;
          provider: string;
          status: string;
          created_at: string;
        }>).map((payment) => ({
          id: String(payment.id),
          amount: moneyValue(payment.amount),
          method: String(payment.provider),
          status: String(payment.status),
          receiptNo: null,
          paidAt: String(payment.created_at),
          label: String(payment.type),
          receiptHref: null,
        }));
        totalDue = legacyPayments.reduce((sum, payment) => sum + payment.amount, 0);
        totalPaid = legacyPayments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
        payments = legacyPayments;
      }
      const latestMetric = ((metricsRes.data ?? []) as Array<{
        average_score: number | string;
        attendance_rate: number | string;
        performance_trend: string;
        risk_level: string;
        alert_flag: boolean;
        computed_at: string;
      }>)[0];

      return NextResponse.json({
        student: {
          id: String(studentRow.id),
          fullName: String(studentRow.full_name),
          photoUrl: studentProfilePhotoUrl(String(studentRow.id), studentRow.photo_url),
          registrationNumber: studentRow.registration_number ? String(studentRow.registration_number) : null,
          birthDate: studentRow.birth_date ? String(studentRow.birth_date) : null,
          classId: String(studentRow.class_id),
          className: String(studentClass?.name ?? ""),
          level: String(studentClass?.level ?? ""),
          academicYear: String(studentClass?.academic_year ?? ""),
        },
        summary: {
          average,
          attendanceRate: attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : null,
          absent: attendanceAbsent,
          late: attendanceLate,
          totalDue,
          totalPaid,
          balance: Math.max(0, totalDue - totalPaid),
          riskLevel: latestMetric?.risk_level ? String(latestMetric.risk_level) : null,
          performanceTrend: latestMetric?.performance_trend ? String(latestMetric.performance_trend) : null,
          alertFlag: Boolean(latestMetric?.alert_flag),
        },
        grades,
        attendance,
        reports,
        payments,
      });
    }

    if (classIdFilter) {
      const { data: classOk, error: classVerifyErr } = await admin
        .from("classes")
        .select("id")
        .eq("id", classIdFilter)
        .eq("school_id", schoolId)
        .maybeSingle();
      if (classVerifyErr) return NextResponse.json({ message: classVerifyErr.message }, { status: 400 });
      if (!classOk) return NextResponse.json({ message: "Classe introuvable" }, { status: 404 });
    }

    let classes: Array<{ id: string; name: string; level: string; academic_year: string }> | null = null;
    if (!classIdFilter) {
      const { data: classesData, error: classesErr } = await admin
        .from("classes")
        .select("id, name, level, academic_year")
        .eq("school_id", schoolId)
        .order("level", { ascending: true })
        .order("name", { ascending: true });
      if (classesErr) return NextResponse.json({ message: classesErr.message }, { status: 400 });
      classes = classesData ?? [];
    }

    const fetchStudents = (includePhotoUrl: boolean) => {
      let studentsQuery = admin
        .from("students")
        .select(
          `id, full_name, ${includePhotoUrl ? "photo_url, " : ""}registration_number, birth_date, class_id,
           class:classes!students_class_id_fkey(id, name, level, academic_year)`,
        )
        .eq("school_id", schoolId);
      if (classIdFilter) {
        studentsQuery = studentsQuery.eq("class_id", classIdFilter);
      }
      return studentsQuery.order("full_name", { ascending: true });
    };

    let studentsResult = await fetchStudents(true);
    if (studentsResult.error && isMissingColumnError(studentsResult.error, "photo_url")) {
      studentsResult = await fetchStudents(false);
    }
    const { data: students, error: studentsErr } = studentsResult;

    if (studentsErr) return NextResponse.json({ message: studentsErr.message }, { status: 400 });

    type StudentClassRow = {
      id: string;
      name: string;
      level: string;
      academic_year: string;
    };

    type StudentRow = {
      id: string;
      full_name: string;
      photo_url?: string | null;
      registration_number: string | null;
      birth_date: string | null;
      class_id: string;
      class: StudentClassRow | StudentClassRow[] | null;
    };

    let mappedStudents = ((students as unknown as StudentRow[]) ?? []).map((student) => {
      const studentClass = pickOne(student.class);
      return {
        id: String(student.id),
        fullName: String(student.full_name),
        photoUrl: studentProfilePhotoUrl(String(student.id), student.photo_url),
        registrationNumber: student.registration_number ? String(student.registration_number) : null,
        birthDate: student.birth_date ? String(student.birth_date) : null,
        classId: String(student.class_id),
        className: String(studentClass?.name ?? ""),
        level: String(studentClass?.level ?? ""),
        academicYear: String(studentClass?.academic_year ?? ""),
      };
    });

    // Alert enrichment can be expensive on large schools; only compute it
    // when a specific class is requested (small result set).
    const studentIds = mappedStudents.map((s) => s.id);
    if (classIdFilter && studentIds.length > 0) {
      const [{ data: gradesRows, error: gradesErr }, { data: attRows, error: attErr }] = await Promise.all([
        admin.from("grades").select("student_id, score").eq("school_id", schoolId).in("student_id", studentIds),
        admin.from("attendance").select("student_id, status").eq("school_id", schoolId).in("student_id", studentIds),
      ]);

      if (gradesErr) return NextResponse.json({ message: gradesErr.message }, { status: 400 });
      if (attErr) return NextResponse.json({ message: attErr.message }, { status: 400 });

      const gradeAgg = new Map<string, { sum: number; n: number }>();
      for (const row of gradesRows ?? []) {
        const sid = String((row as { student_id: string }).student_id);
        const score = Number((row as { score: number }).score);
        const cur = gradeAgg.get(sid) ?? { sum: 0, n: 0 };
        cur.sum += Number.isFinite(score) ? score : 0;
        cur.n += 1;
        gradeAgg.set(sid, cur);
      }

      const attAgg = new Map<string, { total: number; absent: number }>();
      for (const row of attRows ?? []) {
        const sid = String((row as { student_id: string }).student_id);
        const status = String((row as { status: string }).status);
        const cur = attAgg.get(sid) ?? { total: 0, absent: 0 };
        cur.total += 1;
        if (status === "ABSENT") cur.absent += 1;
        attAgg.set(sid, cur);
      }

      mappedStudents = mappedStudents.map((s) => {
        const g = gradeAgg.get(s.id);
        const avg = g && g.n > 0 ? g.sum / g.n : null;
        const lowGrades = avg != null && g!.n >= 2 && avg < 10;

        const a = attAgg.get(s.id);
        const absenceRate = a && a.total >= 5 ? a.absent / a.total : 0;
        const highAbsences = Boolean(a && a.total >= 5 && absenceRate >= 0.25);

        return {
          ...s,
          alerts: {
            lowGrades,
            highAbsences,
            paymentPending: false,
          },
        };
      });
    }

    return NextResponse.json({ classes: classes ?? [], students: mappedStudents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ message }, { status: 500 });
  }
}
