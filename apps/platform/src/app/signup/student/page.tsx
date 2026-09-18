"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const levels = ["6ème", "5ème", "4ème", "3ème", "Seconde", "Première", "Terminale", "Autre"];

function StudentSignupForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to") ?? "https://app.elima.ci/auth/elima/start";
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", schoolLevel: "", declaredSchoolName: "", declaredSchoolCity: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const update = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, role: "STUDENT", returnTo }) });
    const body = await response.json().catch(() => null) as { message?: string; loginUrl?: string } | null;
    setLoading(false);
    if (!response.ok) return setError(body?.message ?? "Inscription impossible.");
    setLoginUrl(body?.loginUrl ?? "/login/email");
  }
  if (loginUrl) return <section className="elima-card mx-auto w-full max-w-lg space-y-4 text-center"><h1 className="text-2xl font-bold text-[var(--accent)]">Compte créé</h1><p className="text-sm text-slate-600">Connecte-toi avec ce compte pour continuer vers Elima Révision.</p><Link href={loginUrl} className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">Me connecter</Link></section>;
  return <section className="elima-card mx-auto w-full max-w-2xl space-y-6"><div><p className="text-xs font-semibold uppercase text-[var(--primary)]">Elima Révision</p><h1 className="mt-2 text-2xl font-bold text-[var(--accent)]">Créer mon compte élève</h1><p className="mt-2 text-sm text-slate-600">Aucune école partenaire n’est nécessaire. Tu pourras rattacher ton compte plus tard avec un code.</p></div><form onSubmit={submit} className="grid gap-4 md:grid-cols-2"><Field label="Prénom" value={form.firstName} onChange={(v) => update("firstName", v)} required /><Field label="Nom" value={form.lastName} onChange={(v) => update("lastName", v)} required /><Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required /><Field label="Mot de passe" type="password" value={form.password} onChange={(v) => update("password", v)} required /><label className="block"><span className="text-sm font-medium text-slate-700">Niveau scolaire</span><select value={form.schoolLevel} onChange={(e) => update("schoolLevel", e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Choisir</option>{levels.map((level) => <option key={level}>{level}</option>)}</select></label><span /><Field label="Nom de l’école (facultatif)" value={form.declaredSchoolName} onChange={(v) => update("declaredSchoolName", v)} /><Field label="Ville (facultatif)" value={form.declaredSchoolCity} onChange={(v) => update("declaredSchoolCity", v)} />{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p> : null}<button disabled={loading} className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">{loading ? "Création…" : "Créer mon compte"}</button></form></section>;
}
export default function StudentSignupPage() { return <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10"><Suspense><StudentSignupForm /></Suspense></main>; }
function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /></label>; }
