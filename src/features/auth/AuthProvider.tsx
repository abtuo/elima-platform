import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { MobileSpace, UserProfile } from "@/types/roles";
import { mainDbClient } from "@/services/mainDbClient";
import { isMainDbConfigured, isDemoModeActive, isDemoModeEnabled } from "@/services/env";
import { fetchUserProfile, getDemoProfile, getHomeSpace, shouldUseDemoProfile } from "@/services/roleService";
import { signInWithIdentifier, signOut as authSignOut } from "@/services/authService";
import { demoAccounts } from "@/constants/demoData";
import { clearElimaIdentitySession } from "@/services/elimaIdentityService";

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile;
  loading: boolean;
  isDemo: boolean;
  activeSpace: MobileSpace;
  authenticated: boolean;
  signIn: (identifier: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(getDemoProfile());
  const [loading, setLoading] = useState(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const isDemo = isDemoModeEnabled();
  const usesLocalDemo = shouldUseDemoProfile();

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchUserProfile(userId);
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    if (!mainDbClient) {
      const demoEmail = localStorage.getItem("elima_demo_session");
      if (demoEmail) {
        setProfile(getDemoProfile(demoEmail));
        setDemoAuthenticated(true);
      }
      setLoading(false);
      return;
    }

    mainDbClient.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = mainDbClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) loadProfile(newSession.user.id);
      else if (isDemoModeActive()) setProfile(getDemoProfile());
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (identifier: string, password: string) => {
    if (usesLocalDemo) {
      const account = demoAccounts.find((item) => item.email.toLowerCase() === identifier.trim().toLowerCase() && item.password === password);
      if (!account) throw new Error("Email ou mot de passe incorrect.");
      const nextProfile = getDemoProfile(account.email);
      localStorage.setItem("elima_demo_session", account.email);
      setProfile(nextProfile);
      setDemoAuthenticated(true);
      return nextProfile;
    }
    const { data, error } = await signInWithIdentifier(identifier, password);
    if (error) throw error;
    if (!data.session?.user) throw new Error("Connexion impossible.");
    const nextProfile = await fetchUserProfile(data.session.user.id);
    if (!nextProfile) throw new Error("Profil utilisateur introuvable.");
    setProfile(nextProfile);
    return nextProfile;
  };

  const signOut = async () => {
    await authSignOut();
    setSession(null);
    localStorage.removeItem("elima_demo_session");
    setDemoAuthenticated(false);
    setProfile(getDemoProfile());
    clearElimaIdentitySession();
  };

  const refreshProfile = async () => {
    const userId = session?.user.id;
    if (!userId) return null;
    const nextProfile = await fetchUserProfile(userId);
    if (nextProfile) setProfile(nextProfile);
    return nextProfile;
  };

  const activeSpace = getHomeSpace(profile.role);

  return (
    <AuthContext.Provider value={{ session, profile, loading, isDemo, authenticated: Boolean(session) || demoAuthenticated, activeSpace, signIn, signOut, refreshProfile }}>
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
