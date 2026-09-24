import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { STUDENT_CLASS_OPTIONS } from "@/constants/studentClasses";
import { completeElimaIdentitySession, signInWithElimaPassword } from "@/services/elimaIdentityService";
import { registerElimaAccount, requestRegistrationCode } from "@/services/registrationService";

export function RevisionRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", identifier: "", verificationPhone: "", password: "", confirmPassword: "", schoolLevel: "", declaredSchoolName: "", declaredSchoolCity: "" });
  const [verification, setVerification] = useState({ challengeId: "", code: "" });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verificationPhone = form.identifier.includes("@") ? form.verificationPhone : form.identifier;

  const update = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "identifier" || name === "verificationPhone") setVerification({ challengeId: "", code: "" });
  };

  async function sendVerificationCode() {
    setError("");
    setLoading(true);
    try {
      const result = await requestRegistrationCode({ identifier: form.identifier, phone: verificationPhone });
      setVerification({ challengeId: result.challengeId, code: "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi du code impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!accepted) return setError("Vous devez accepter les conditions d’utilisation.");
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    if (!verification.challengeId) return sendVerificationCode();
    if (!/^\d{6}$/.test(verification.code)) return setError("Saisissez le code à 6 chiffres reçu sur WhatsApp.");
    setLoading(true);
    try {
      const registration = await registerElimaAccount({ role: "student", firstName: form.firstName, lastName: form.lastName, identifier: form.identifier, password: form.password, schoolLevel: form.schoolLevel, declaredSchoolName: form.declaredSchoolName, declaredSchoolCity: form.declaredSchoolCity, verificationPhone, verificationId: verification.challengeId, verificationCode: verification.code });
      if (registration.session?.access_token) await completeElimaIdentitySession(registration.session);
      else await signInWithElimaPassword(registration.loginIdentifier ?? form.identifier, form.password, { recentSignup: true });
      navigate("/student/reviser", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-[100dvh] bg-[#f3f7f4] px-4 py-8 sm:px-6"><section className="mx-auto w-full max-w-2xl">
    <div className="flex items-center justify-between"><Link to="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link><ElimaLogo className="w-28" /><span className="w-11" /></div>
    <form onSubmit={submit} className="mt-8 rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(21,55,42,.1)] sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[.15em] text-revision">Elima Révision</p><h1 className="mt-2 font-title text-3xl font-semibold text-accent">Créer mon compte élève</h1><p className="mt-2 text-sm leading-6 text-gray-500">Ton compte Révision fonctionne même si ton école n’utilise pas encore Elima.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2"><Field label="Prénom" value={form.firstName} onChange={(value) => update("firstName", value)} required /><Field label="Nom" value={form.lastName} onChange={(value) => update("lastName", value)} required /></div>
      <div className="mt-4"><Field label="Email ou téléphone" value={form.identifier} onChange={(value) => update("identifier", value)} placeholder="nom@exemple.ci ou +225..." required /></div>
      {form.identifier.includes("@") ? <div className="mt-4"><Field label="Numéro WhatsApp de vérification" value={form.verificationPhone} onChange={(value) => update("verificationPhone", value)} placeholder="+225..." required hint="Format international" /></div> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Mot de passe" type="password" value={form.password} onChange={(value) => update("password", value)} required hint="8 caractères minimum" /><Field label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} required /></div>
      <div className="mt-4 space-y-4 rounded-2xl bg-revision/[.04] p-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">Classe / niveau</span><select value={form.schoolLevel} onChange={(event) => update("schoolLevel", event.target.value)} required className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-revision"><option value="">Choisir</option>{STUDENT_CLASS_OPTIONS.map((level) => <option key={level}>{level}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Nom de mon école (facultatif)" value={form.declaredSchoolName} onChange={(value) => update("declaredSchoolName", value)} /><Field label="Ville (facultatif)" value={form.declaredSchoolCity} onChange={(value) => update("declaredSchoolCity", value)} /></div></div>
      <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-gray-500"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>J’accepte les conditions d’utilisation et la politique de confidentialité d’Elima.</span></label>
      {verification.challengeId ? <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[.04] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-primary"><KeyRound className="h-4 w-4" />Vérification WhatsApp</div><p className="mt-2 text-xs leading-5 text-gray-500">Un code à 6 chiffres a été envoyé au {verificationPhone}. Il expire dans 10 minutes.</p><input value={verification.code} onChange={(event) => setVerification((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-center text-xl font-bold tracking-[.35em] outline-none focus:border-primary" /><button type="button" disabled={loading} onClick={sendVerificationCode} className="mt-3 text-xs font-semibold text-primary disabled:opacity-50">Renvoyer un code</button></div> : null}
      {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-revision py-3.5 text-sm font-semibold text-white shadow-lg shadow-revision/20 disabled:opacity-60">{loading ? "Envoi…" : verification.challengeId ? <>Vérifier et créer mon compte <ArrowRight className="h-4 w-4" /></> : <>Recevoir mon code <ArrowRight className="h-4 w-4" /></>}</button>
    </form>
  </section></main>;
}

function Field({ label, value, onChange, type = "text", required, hint, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; hint?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-2 flex justify-between gap-2 text-sm font-semibold text-gray-700"><span>{label}</span>{hint ? <span className="text-xs font-normal text-gray-400">{hint}</span> : null}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-primary" /></label>;
}
