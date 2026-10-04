import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserLocalAuthStorage } from "@elima/auth";
import type { MobileSpace, UserProfile } from "@/types/roles";
import { mainDbClient } from "@/services/mainDbClient";
import {revisionDbClient} from '@/services/revisionDbClient';
import { isMainDbConfigured, isDemoModeActive, shouldShowSeedAccounts } from "@/services/env";
import { fetchUserProfile } from "@/services/profileService";
import { signInWithIdentifier, signOut as authSignOut } from "@/services/authService";
import { clearElimaIdentitySession, refreshElimaIdentityProfile } from "@/services/elimaIdentityService";
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
  isDemo: boolean;
  activeSpace: MobileSpace;
  authenticated: boolean;
  signIn: (identifier: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, demoAccounts, getDemoProfile }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(getDemoProfile());
  const [loading, setLoading] = useState(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState(false);
  const isDemo = shouldShowSeedAccounts();
  const usesLocalDemo = isDemoModeActive();

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchUserProfile(userId);
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    if (usesLocalDemo) {
      const demoEmail = browserLocalAuthStorage.getItem("elima_demo_session");
      if (demoEmail && demoAccounts.some((account) => account.email.toLowerCase() === demoEmail.toLowerCase())) {
        setProfile(getDemoProfile(demoEmail));
        setDemoAuthenticated(true);
      }
      setLoading(false);
      return;
    }

    if (!mainDbClient) { setLoading(false); return; }
    mainDbClient.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await refreshElimaIdentityProfile();
        await loadProfile(data.session.user.id);
      }
    }).catch(() => setSession(null)).finally(() => setLoading(false));

    const { data: sub } = mainDbClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) setTimeout(() => { void refreshElimaIdentityProfile().catch(() => null).then(() => loadProfile(newSession.user.id)); },0);
      else { void revisionDbClient?.auth.signOut({scope:'local'}); if (isDemoModeActive()) setProfile(getDemoProfile()); }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, usesLocalDemo, getDemoProfile, demoAccounts]);

  const signIn = async (identifier: string, password: string) => {
    if (usesLocalDemo) {
      const account = demoAccounts.find((item) => item.email.toLowerCase() === identifier.trim().toLowerCase() && item.password === password);
      if (!account) throw new Error("Email ou mot de passe incorrect.");
      const nextProfile = getDemoProfile(account.email);
      browserLocalAuthStorage.setItem("elima_demo_session", account.email);
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
    setSession(data.session);
    return nextProfile;
  };

  const signOut = async () => {
    await authSignOut();
    setSession(null);
    browserLocalAuthStorage.removeItem("elima_demo_session");
    setDemoAuthenticated(false);
    setProfile(getDemoProfile());
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
    <AuthContext.Provider value={{ session, profile, loading, isDemo, authenticated: Boolean(session && profile.id===session.user.id) || demoAuthenticated, activeSpace, signIn, signOut, refreshProfile }}>
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
