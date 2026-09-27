import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { STUDENT_CLASS_OPTIONS } from "@/constants/studentClasses";
import { completeElimaIdentitySession, signInWithElimaPassword } from "@/services/elimaIdentityService";
import { checkVerificationCode, confirmPasswordReset, exchangePhoneControlForReset, registerElimaAccount, requestRegistrationCode } from "@/services/registrationService";

type Phase = "identity" | "otp" | "account" | "existing" | "reset" | "reset-complete";

export function RevisionRegistrationPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("identity");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", password: "", confirmPassword: "", schoolLevel: "", declaredSchoolName: "", declaredSchoolCity: "" });
  const [requestToken, setRequestToken] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [code, setCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const update = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));

  async function run(action: () => Promise<void>) {
    setError("");
    setLoading(true);
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Service momentanément indisponible."); }
    finally { setLoading(false); }
  }

  async function requestCode() {
    await run(async () => {
      const result = await requestRegistrationCode(form.phone);
      setRequestToken(result.requestToken);
      setCode("");
      setCooldown(60);
      setPhase("otp");
    });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await checkVerificationCode({ phone: form.phone, code, requestToken });
      setAuthorization(result.authorization);
      setPhase(result.accountExists ? "existing" : "account");
    });
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!accepted) return setError("Vous devez accepter les conditions d’utilisation.");
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    await run(async () => {
      const registration = await registerElimaAccount({ role: "student", firstName: form.firstName, lastName: form.lastName, phone: form.phone, password: form.password, schoolLevel: form.schoolLevel, declaredSchoolName: form.declaredSchoolName, declaredSchoolCity: form.declaredSchoolCity, authorization });
      if (registration.session?.access_token) await completeElimaIdentitySession(registration.session);
      else await signInWithElimaPassword(form.phone, form.password, { recentSignup: true });
      navigate("/student/reviser", { replace: true });
    });
  }

  async function startReset() {
    await run(async () => {
      setAuthorization(await exchangePhoneControlForReset({ phone: form.phone, authorization }));
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      setPhase("reset");
    });
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    await run(async () => {
      await confirmPasswordReset({ phone: form.phone, authorization, password: form.password });
      setPhase("reset-complete");
    });
  }

  const card = (content: React.ReactNode) => <main className="min-h-[100dvh] bg-[#f3f7f4] px-4 py-8 sm:px-6"><section className="mx-auto w-full max-w-2xl"><div className="flex items-center justify-between"><Link to="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link><ElimaLogo className="w-28" /><span className="w-11" /></div><div className="mt-8 rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(21,55,42,.1)] sm:p-9">{content}</div></section></main>;
  const title = (value: string, description?: React.ReactNode) => <><p className="text-sm font-semibold uppercase tracking-[.15em] text-revision">Elima Révision</p><h1 className="mt-2 font-title text-3xl font-semibold text-accent">{value}</h1>{description ? <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p> : null}</>;
  const errorMessage = error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null;

  if (phase === "identity") return card(<form onSubmit={(event) => { event.preventDefault(); void requestCode(); }}>{title("Créer mon compte élève")}<div className="mt-7 grid gap-4 sm:grid-cols-2"><Field name="firstName" autoComplete="given-name" label="Prénom" value={form.firstName} onChange={(value) => update("firstName", value)} required /><Field name="lastName" autoComplete="family-name" label="Nom" value={form.lastName} onChange={(value) => update("lastName", value)} required /></div><div className="mt-4"><Field name="phone" autoComplete="tel" label="Numéro WhatsApp de l’élève" type="tel" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+225 05 00 00 00 00" required hint="Format international, ex. +225 05 00 00 00 00" /></div>{errorMessage}<PrimaryButton loading={loading}>Vérifier mon numéro</PrimaryButton></form>);

  if (phase === "otp") return card(<form onSubmit={verifyCode}>{title("Vérifier mon numéro", <>Nous avons envoyé un code sur WhatsApp au <strong>{form.phone}</strong>.</>)}<div className="mt-6"><Field name="verificationCode" autoComplete="one-time-code" label="Code de vérification" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="______" required /></div>{errorMessage}<PrimaryButton loading={loading}>Continuer</PrimaryButton><div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-semibold text-primary"><button type="button" disabled={loading || cooldown > 0} onClick={() => void requestCode()} className="disabled:text-gray-400">{cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}</button><button type="button" onClick={() => { setPhase("identity"); setRequestToken(""); setCode(""); setError(""); }}>Modifier le numéro</button></div></form>);

  if (phase === "existing") return card(<>{title("Numéro déjà associé", "Ce numéro est déjà associé à un compte Elima.")}<div className="mt-7 grid gap-3"><Link to="/auth/login" className="rounded-2xl bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white">Se connecter</Link><button type="button" disabled={loading} onClick={() => void startReset()} className="rounded-2xl border border-primary/20 px-5 py-3.5 text-sm font-semibold text-primary disabled:opacity-60">Réinitialiser mon mot de passe</button></div>{errorMessage}</>);

  if (phase === "reset-complete") return card(<>{title("Votre mot de passe a été modifié.", "Vous pouvez maintenant vous connecter.")}<Link to="/auth/login" className="mt-7 block rounded-2xl bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white">Se connecter</Link></>);

  if (phase === "reset") return card(<form onSubmit={resetPassword}>{title("Nouveau mot de passe")}<div className="mt-7 grid gap-4 sm:grid-cols-2"><Field name="password" autoComplete="new-password" label="Nouveau mot de passe" type="password" value={form.password} onChange={(value) => update("password", value)} required /><Field name="confirmPassword" autoComplete="new-password" label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} required /></div>{errorMessage}<PrimaryButton loading={loading}>Modifier mon mot de passe</PrimaryButton></form>);

  return card(<form onSubmit={createAccount}>{title("Créer mon compte", `Numéro vérifié : ${form.phone}`)}<div className="mt-7 grid gap-4 sm:grid-cols-2"><Field name="password" autoComplete="new-password" label="Mot de passe" type="password" value={form.password} onChange={(value) => update("password", value)} required hint="8 caractères minimum" /><Field name="confirmPassword" autoComplete="new-password" label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} required /></div><div className="mt-4 space-y-4 rounded-2xl bg-revision/[.04] p-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">Classe / niveau</span><select name="schoolLevel" autoComplete="off" value={form.schoolLevel} onChange={(event) => update("schoolLevel", event.target.value)} required className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-revision"><option value="">Choisir</option>{STUDENT_CLASS_OPTIONS.map((level) => <option key={level}>{level}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field name="declaredSchoolName" autoComplete="organization" label="Nom de mon école (facultatif)" value={form.declaredSchoolName} onChange={(value) => update("declaredSchoolName", value)} /><Field name="declaredSchoolCity" autoComplete="address-level2" label="Ville (facultatif)" value={form.declaredSchoolCity} onChange={(value) => update("declaredSchoolCity", value)} /></div></div><label className="mt-5 flex items-start gap-3 text-xs leading-5 text-gray-500"><input name="acceptTerms" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>J’accepte les conditions d’utilisation et la politique de confidentialité d’Elima.</span></label>{errorMessage}<PrimaryButton loading={loading}>Créer mon compte</PrimaryButton></form>);
}

function PrimaryButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-revision py-3.5 text-sm font-semibold text-white shadow-lg shadow-revision/20 disabled:opacity-60">{loading ? "Envoi…" : <>{children}<ArrowRight className="h-4 w-4" /></>}</button>;
}

function Field({ name, autoComplete, label, value, onChange, type = "text", required, hint, placeholder, inputMode }: { name: string; autoComplete: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; hint?: string; placeholder?: string; inputMode?: "numeric" }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input name={name} autoComplete={autoComplete} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-primary" />{hint ? <span className="mt-1.5 block text-xs font-normal text-gray-400">{hint}</span> : null}</label>;
}
