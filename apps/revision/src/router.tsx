import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, useRequiresAuth } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { RevisionRegistrationPage } from "@/features/auth/RegistrationPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ElimaOAuthCallbackPage, ElimaOAuthStartPage } from "@/features/auth/ElimaOAuthPages";
import { StudentHomePage } from "@/features/home/StudentHomePage";
import { SubscriptionPage } from "@/features/subscription/SubscriptionPage";
import { QuotaNotice } from "@/features/subscription/QuotaNotice";
import { BillingSync } from "@/features/subscription/BillingSync";
import { RevisionDashboardPage } from "@/features/revision/RevisionDashboardPage";
import { QuizPage } from "@/features/revision/QuizPage";
import { CoursesPage, CourseSheetDetailPage } from "@/features/revision/CoursesPage";
import { LearningSolverPage } from "@/features/revision/LearningSolverPage";
import { LearningResultsPage } from "@/features/revision/LearningResultsPage";
import { LegalPage } from "@/features/legal/LegalPage";
import { RevisionShell } from "./RevisionShell";
import { NativeRuntimeEffects } from "./components/NativeRuntimeEffects";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { RevisionWelcomePage } from "./RevisionWelcomePage";
import { RevisionStudentProfilePage } from "./RevisionStudentProfilePage";
import { getRevisionDemoProfile, revisionDemoAccounts } from "./revisionDemoAuth";

function RevisionEntryPage() {
  const { authenticated, loading, profile, configurationError } = useAuth();
  if (loading) return null;
  if (configurationError) return <ConfigurationError message={configurationError} />;
  if (!authenticated) return <RevisionWelcomePage />;
  return <Navigate to={profile.role === "STUDENT" ? "/student" : "/auth/login"} replace />;
}

function ConfigurationError({ message }: { message: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><section className="card max-w-lg p-8 text-center"><h1 className="font-title text-2xl font-semibold text-accent">Elima Révision indisponible</h1><p className="mt-3 text-sm leading-6 text-gray-600">{message}</p></section></main>;
}

function RevisionProtectedLayout() {
  const { authenticated, loading } = useRequiresAuth();
  const { profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-revision border-t-transparent" /></div>;
  }
  if (!authenticated || profile.role !== "STUDENT") {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  return <RevisionShell><Outlet /></RevisionShell>;
}

export function RevisionRouter() {
  return (
    <BrowserRouter>
      <AuthProvider demoAccounts={revisionDemoAccounts} getDemoProfile={getRevisionDemoProfile}>
        <NativeRuntimeEffects />
        <BillingSync />
        <OfflineBanner />
        <QuotaNotice />
        <ConfiguredRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function ConfiguredRoutes() {
  const { configurationError } = useAuth();
  const location = useLocation();
  if (configurationError && !location.pathname.startsWith("/legal/")) return <ConfigurationError message={configurationError} />;
  return (
        <Routes>
          <Route path="/legal/terms" element={<LegalPage kind="terms" />} />
          <Route path="/legal/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/legal/account-deletion" element={<LegalPage kind="account-deletion" />} />
          <Route path="/" element={<RevisionEntryPage />} />
          <Route path="/auth/login" element={<LoginPage mode="revision" demoAccounts={revisionDemoAccounts} />} />
          <Route path="/auth/inscription" element={<RevisionRegistrationPage />} />
          <Route path="/auth/inscription-eleve" element={<Navigate to="/auth/inscription" replace />} />
          <Route path="/auth/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="/auth/elima/start" element={<ElimaOAuthStartPage />} />
          <Route path="/auth/elima/callback" element={<ElimaOAuthCallbackPage />} />

          <Route element={<RevisionProtectedLayout />}>
            <Route path="/student" element={<StudentHomePage />} />
            <Route path="/student/abonnement" element={<SubscriptionPage />} />
            <Route path="/student/reviser" element={<RevisionDashboardPage />} />
            <Route path="/student/reviser/devoirs" element={<Navigate to="/student/reviser?mode=scanner" replace />} />
            <Route path="/student/reviser/examen" element={<Navigate to="/student/reviser?mode=scanner" replace />} />
            <Route path="/student/reviser/parcours/session/:id" element={<LearningSolverPage contentType="guided_exercise" />} />
            <Route path="/student/reviser/parcours/resultats/:contentType/:id" element={<LearningResultsPage />} />
            <Route path="/student/reviser/devoirs/exercice/:id" element={<LearningSolverPage contentType="guided_exercise" />} />
            <Route path="/student/reviser/devoirs/examen/:id" element={<LearningSolverPage contentType="exam" />} />
            <Route path="/student/reviser/devoirs/resultats/:contentType/:id" element={<LearningResultsPage />} />
            <Route path="/student/reviser/quiz" element={<QuizPage />} />
            <Route path="/student/reviser/fiches" element={<CoursesPage />} />
            <Route path="/student/reviser/fiches/:id" element={<CourseSheetDetailPage />} />
            <Route path="/student/profil" element={<RevisionStudentProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  );
}
