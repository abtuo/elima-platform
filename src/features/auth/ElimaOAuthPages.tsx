import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { beginElimaSignIn, completeElimaSignIn } from "@/services/elimaIdentityService";

export function ElimaOAuthStartPage() {
  const [error, setError] = useState("");
  useEffect(() => { beginElimaSignIn("/").catch((caught) => setError(caught instanceof Error ? caught.message : "Connexion impossible.")); }, []);
  return <AuthTransition title="Connexion à Elima…" error={error} />;
}

export function ElimaOAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    const oauthError = params.get("error_description") || params.get("error");
    const code = params.get("code"); const state = params.get("state");
    if (oauthError || !code || !state) { setError(oauthError ?? "Réponse OAuth incomplète."); return; }
    completeElimaSignIn(code, state).then((path) => navigate(path, { replace: true })).catch((caught) => setError(caught instanceof Error ? caught.message : "Connexion impossible."));
  }, [navigate, params]);
  return <AuthTransition title="Finalisation de la connexion…" error={error} />;
}

function AuthTransition({ title, error }: { title: string; error: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl">{!error ? <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}<h1 className="mt-5 font-title text-xl font-semibold text-accent">{error ? "Connexion impossible" : title}</h1>{error ? <><p className="mt-3 text-sm text-red-600">{error}</p><a href="/auth/login" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white">Revenir à la connexion</a></> : null}</section></main>; }
