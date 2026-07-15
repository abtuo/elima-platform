import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { StudentRegisterPage } from "@/features/auth/StudentRegisterPage";
import { ElimaOAuthCallbackPage, ElimaOAuthStartPage } from "@/features/auth/ElimaOAuthPages";
import { ProtectedLayout, SpaceRedirect } from "@/app/layouts";

import { ParentHomePage } from "@/features/parent/ParentHomePage";
import { ParentChildrenPage } from "@/features/parent/ParentChildrenPage";
import { ParentMessagesPage } from "@/features/parent/ParentMessagesPage";
import { ParentPaymentsPage } from "@/features/parent/ParentPaymentsPage";
import { ParentProfilePage } from "@/features/parent/ParentProfilePage";

import { StudentHomePage } from "@/features/student/StudentHomePage";
import { StudentAssignmentsPage } from "@/features/student/StudentAssignmentsPage";
import { StudentProfilePage } from "@/features/student/StudentProfilePage";
import { StudentMessagesPage } from "@/features/student/StudentMessagesPage";
import { StudentTimetablePage } from "@/features/student/StudentTimetablePage";
import { RevisionDashboardPage } from "@/features/revision/RevisionDashboardPage";
import { QuizPage } from "@/features/revision/QuizPage";
import { CoursesPage, CourseSheetDetailPage } from "@/features/revision/CoursesPage";
import { ScannerPage } from "@/features/scanner/ScannerPage";

import { TeacherTodayPage } from "@/features/teacher/TeacherTodayPage";
import { TeacherClassesPage } from "@/features/teacher/TeacherClassesPage";
import { TeacherAssignmentsPage } from "@/features/teacher/TeacherAssignmentsPage";
import { TeacherResourcesPage } from "@/features/teacher/TeacherResourcesPage";
import { TeacherMessagesPage } from "@/features/teacher/TeacherMessagesPage";
import { TeacherSyncPage } from "@/features/offline/TeacherSyncPage";

import { AdminDashboardPage } from "@/features/admin/AdminDashboardPage";
import { AdminStudentsPage } from "@/features/admin/AdminStudentsPage";
import { AdminPaymentsPage } from "@/features/admin/AdminPaymentsPage";
import { AdminMessagesPage } from "@/features/admin/AdminMessagesPage";
import { AdminAlertsPage } from "@/features/admin/AdminAlertsPage";
import { SuppliesPage } from "@/features/supplies/SuppliesPage";
import { AccountPage } from "@/features/profile/AccountPage";
import { CommunicationsPage } from "@/features/messages/CommunicationsPage";

import { useAuth } from "@/features/auth/AuthProvider";
import { getProfileHomePath } from "@/types/roles";

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={getProfileHomePath(profile)} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/inscription-eleve" element={<StudentRegisterPage />} />
          <Route path="/auth/elima/start" element={<ElimaOAuthStartPage />} />
          <Route path="/auth/elima/callback" element={<ElimaOAuthCallbackPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<RootRedirect />} />

            <Route path="/parent" element={<SpaceRedirect space="parent" />}>
              <Route index element={<ParentHomePage />} />
              <Route path="enfants" element={<ParentChildrenPage />} />
              <Route path="messages" element={<ParentMessagesPage />} />
              <Route path="alertes" element={<CommunicationsPage kind="alert" />} />
              <Route path="paiements" element={<ParentPaymentsPage />} />
              <Route path="fournitures" element={<SuppliesPage />} />
              <Route path="profil" element={<ParentProfilePage />} />
            </Route>

            <Route path="/student" element={<SpaceRedirect space="student" />}>
              <Route index element={<StudentHomePage />} />
              <Route path="devoirs" element={<StudentAssignmentsPage />} />
              <Route path="emploi-du-temps" element={<StudentTimetablePage />} />
              <Route path="reviser" element={<RevisionDashboardPage />} />
              <Route path="reviser/quiz" element={<QuizPage />} />
              <Route path="reviser/fiches" element={<CoursesPage />} />
              <Route path="reviser/fiches/:id" element={<CourseSheetDetailPage />} />
              <Route path="documents" element={<ScannerPage />} />
              <Route path="messages" element={<StudentMessagesPage />} />
              <Route path="alertes" element={<CommunicationsPage kind="alert" />} />
              <Route path="scanner" element={<Navigate to="/student/documents" replace />} />
              <Route path="profil" element={<StudentProfilePage />} />
            </Route>

            <Route path="/teacher" element={<SpaceRedirect space="teacher" />}>
              <Route index element={<TeacherTodayPage />} />
              <Route path="classes" element={<TeacherClassesPage />} />
              <Route path="devoirs" element={<TeacherAssignmentsPage />} />
              <Route path="ressources" element={<TeacherResourcesPage />} />
              <Route path="messages" element={<TeacherMessagesPage />} />
              <Route path="alertes" element={<CommunicationsPage kind="alert" />} />
              <Route path="fournitures" element={<SuppliesPage />} />
              <Route path="sync" element={<TeacherSyncPage />} />
              <Route path="profil" element={<AccountPage />} />
            </Route>

            <Route path="/admin" element={<SpaceRedirect space="admin" />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="eleves" element={<AdminStudentsPage />} />
              <Route path="paiements" element={<AdminPaymentsPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="alertes" element={<AdminAlertsPage />} />
              <Route path="fournitures" element={<SuppliesPage />} />
              <Route path="profil" element={<AccountPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
