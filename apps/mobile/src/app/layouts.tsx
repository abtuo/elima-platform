import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useRequiresAuth } from "@/features/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { getProfileHomePath, isStandaloneStudent, ROLE_HOME } from "@/types/roles";
import type { MobileSpace } from "@/types/roles";

function ProtectedLayout() {
  const { authenticated, loading } = useRequiresAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function SpaceRedirect({ space }: { space: MobileSpace }) {
  const { profile } = useAuth();
  const location = useLocation();
  const home = ROLE_HOME[profile.role];
  if (home !== space) {
    return <Navigate to={`/${home}`} replace />;
  }
  if (isStandaloneStudent(profile) && !location.pathname.startsWith("/student/reviser") && location.pathname !== "/student/profil") {
    return <Navigate to={getProfileHomePath(profile)} replace />;
  }
  return <Outlet />;
}

export { ProtectedLayout, SpaceRedirect };
