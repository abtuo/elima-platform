import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getProfileHomePath } from "@/types/roles";
import { demoAccounts } from "@/constants/demoData";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { beginElimaSignIn, isElimaIdentityConfigured, openElimaStudentSignup } from "@/services/elimaIdentityService";

export function LoginPage() {
  const { signIn, isDemo } = useAuth();
  const navigate = useNavigate();
  const showSeedAccounts = isDemo;
  const [identifier, setIdentifier] = useState(isDemo ? demoAccounts[0].email : "");
  const [password, setPassword] = useState(isDemo ? demoAccounts[0].password : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await signIn(identifier, password);
      navigate(getProfileHomePath(profile), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f7f4] px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:p-0">
      <section className="relative hidden overflow-hidden bg-[#123c2d] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <ElimaLogo className="relative z-10 w-36 brightness-0 invert" />
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-secondary" /> Votre école, toujours avec vous</span>
          <h1 className="mt-7 font-title text-5xl font-semibold leading-tight">Suivre, apprendre et avancer ensemble.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/70">Une expérience simple et sécurisée pour les familles, les élèves et les équipes éducatives.</p>
        </div>
        <p className="relative z-10 text-sm text-white/45">Elima · L’éducation connectée avec confiance</p>
      </section>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center lg:min-h-screen lg:px-10">
      <div className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(21,55,42,.12)] backdrop-blur sm:p-9">
        <div className="mb-8">
          <ElimaLogo className="mx-auto mb-7 w-32" />
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Bienvenue</p>
            <h2 className="mt-2 font-title text-3xl font-semibold text-accent">Connectez-vous à Elima</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">Retrouvez votre espace personnel et les informations de votre établissement.</p>
          </div>
        </div>
        {showSeedAccounts ? (
          <details className="mb-5 rounded-2xl border border-primary/10 bg-primary/[.04] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-primary">Comptes de démonstration</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button key={account.email} type="button" onClick={() => { setIdentifier(account.email); setPassword(account.password); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-gray-700 transition hover:border-primary/30 hover:bg-primary/[.03]">
                  {account.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
        {isElimaIdentityConfigured() ? <><button type="button" onClick={() => beginElimaSignIn("/").catch((caught) => setError(caught instanceof Error ? caught.message : "Connexion impossible."))} className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20">Continuer avec mon compte Elima <ArrowRight className="h-4 w-4" /></button><div className="mb-5 flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />ou connexion existante<span className="h-px flex-1 bg-gray-200" /></div></> : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Email ou téléphone</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-primary"
              placeholder="email@exemple.ci ou +225..."
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Mot de passe</label>
            <div className="relative"><input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-primary"
              required
            /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          </div>
          {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {loading ? "Connexion…" : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        <div className="mt-5 border-t border-gray-100 pt-5 text-center">
          <p className="text-sm text-gray-500">Tu veux réviser sans compte école ?</p>
          <button type="button" onClick={openElimaStudentSignup} className="mt-2 text-sm font-semibold text-revision">Créer un compte élève</button>
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-gray-400">Connexion sécurisée · Vos données restent protégées par votre établissement.</p>
      </div>
      </section>
    </main>
  );
}
