import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserLocalAuthStorage } from "@elima/auth";
import type { MobileSpace, UserProfile } from "@/types/roles";
import { mainDbClient } from "@/services/mainDbClient";
import { getRevisionConfigurationError, isMainDbConfigured, isDemoModeActive, shouldShowSeedAccounts } from "@/services/env";
import { fetchUserProfile } from "@/services/profileService";
import { clearElimaIdentitySession, restoreElimaSession, signInWithElimaPassword } from "@/services/elimaIdentityService";
import { ROLE_HOME } from "@/types/roles";

export type DemoAuthAccount = { email: string; password: string };

type AuthProviderProps = {
  children: ReactNode;
  demoAccounts: readonly DemoAuthAccount[];
  getDemoProfile: (email?: string) => UserProfile;
};

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile;
  loading: boolean;
  configurationError: string;
  isDemo: boolean;
  activeSpace: MobileSpace;
  authenticated: boolean;
  signIn: (identifier: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, demoAccounts, getDemoProfile }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(getDemoProfile());
  const [loading, setLoading] = useState(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const isDemo = shouldShowSeedAccounts();
  const usesLocalDemo = isDemoModeActive();
  const configurationError = getRevisionConfigurationError();

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchUserProfile(userId);
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    if (configurationError) {
      setLoading(false);
      return;
    }
    if (usesLocalDemo || !mainDbClient) {
      const demoEmail = browserLocalAuthStorage.getItem("elima_demo_session");
      if (demoEmail && demoAccounts.some((account) => account.email.toLowerCase() === demoEmail.toLowerCase())) {
        setProfile(getDemoProfile(demoEmail));
        setDemoAuthenticated(true);
      }
      setLoading(false);
      return;
    }

    let active = true;
    let restoring = false;
    const restore = async () => {
      if (restoring) return;
      restoring = true;
      try {
        const restored = await restoreElimaSession();
        if (!active) return;
        setSession(restored);
        if (restored?.user) await loadProfile(restored.user.id);
      } catch {
        // Temporary network/bridge failure: retain persisted tokens for the next retry.
        // At cold start the UI remains unauthenticated until restoration succeeds.
      } finally {
        restoring = false;
        if (active) setLoading(false);
      }
    };
    void restore();
    const interval = window.setInterval(() => { void restore(); }, 60_000);
    const resume = () => { if (document.visibilityState === "visible") void restore(); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);

    const { data: sub } = mainDbClient.auth.onAuthStateChange((_event, newSession) => {
      // Never call auth APIs inside Supabase's callback (auth lock/deadlock).
      // INITIAL_SESSION alone is not proof of a valid central Identity session.
      if (_event === "INITIAL_SESSION") return;
      if (!newSession) setSession(null);
      else if (!restoring) {
        setSession(newSession);
        window.setTimeout(() => { if (active) void loadProfile(newSession.user.id).catch(() => undefined); }, 0);
      }
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, usesLocalDemo, getDemoProfile, demoAccounts, configurationError]);

  const signIn = async (identifier: string, password: string) => {
    if (configurationError) throw new Error(configurationError);
    if (usesLocalDemo) {
      const account = demoAccounts.find((item) => item.email.toLowerCase() === identifier.trim().toLowerCase() && item.password === password);
      if (!account) throw new Error("Email ou mot de passe incorrect.");
      const nextProfile = getDemoProfile(account.email);
      browserLocalAuthStorage.setItem("elima_demo_session", account.email);
      setProfile(nextProfile);
      setDemoAuthenticated(true);
      return nextProfile;
    }
    const { localUserId } = await signInWithElimaPassword(identifier, password);
    if (!localUserId) throw new Error("Profil Elima introuvable.");
    const nextProfile = await fetchUserProfile(localUserId);
    if (!nextProfile) throw new Error("Profil utilisateur introuvable.");
    setProfile(nextProfile);
    return nextProfile;
  };

  const signOut = async () => {
    try { await clearElimaIdentitySession(); }
    finally {
      setSession(null);
      browserLocalAuthStorage.removeItem("elima_demo_session");
      setDemoAuthenticated(false);
      setProfile(getDemoProfile());
    }
  };

  const refreshProfile = async () => {
    const userId = session?.user.id;
    if (!userId) return null;
    const nextProfile = await fetchUserProfile(userId);
    if (nextProfile) setProfile(nextProfile);
    return nextProfile;
  };

  const activeSpace = ROLE_HOME[profile.role];

  return (
    <AuthContext.Provider value={{ session, profile, loading, configurationError, isDemo, authenticated: Boolean(session) || demoAuthenticated, activeSpace, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequiresAuth() {
  const { authenticated, loading } = useAuth();
  return { authenticated, loading, needsLogin: !authenticated && isMainDbConfigured() };
}
