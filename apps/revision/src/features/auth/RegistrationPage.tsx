import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, School, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { SchoolCycle } from "@elima/revision-core";
import { REVISION_EDUCATION_SYSTEM, compatibleSubjectIds } from "@elima/revision-core";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { LegalLinks } from "@/components/common/LegalLinks";
import { studentClassesForCycle } from "@/constants/studentClasses";
import { revisionSubjectsForEducation } from "@/lib/revisionSubjects";
import { completeElimaIdentitySession, signInWithElimaPassword } from "@/services/elimaIdentityService";
import { checkVerificationCode, confirmPasswordReset, exchangePhoneControlForReset, registerElimaAccount, requestRegistrationCode } from "@/services/registrationService";
import { saveRevisionOnboarding } from "@/services/studentAccountService";
import { useAndroidBack, useRevealAuthError } from "@/hooks/useAndroidBack";

type Phase = "identity" | "otp" | "account" | "existing" | "reset" | "reset-complete";
type OnboardingStep = "welcome" | "cycle" | "class" | "subjects" | "confirmation";
const ONBOARDING_STEPS: OnboardingStep[] = ["welcome", "cycle", "class", "subjects", "confirmation"];

export function RevisionRegistrationPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("identity");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", password: "", confirmPassword: "", schoolLevel: "", declaredSchoolName: "", declaredSchoolCity: "" });
  const [cycle, setCycle] = useState<SchoolCycle | null>(null);
  const [guardianAcknowledged, setGuardianAcknowledged] = useState(false);
  const [requestToken, setRequestToken] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [resetReady, setResetReady] = useState(false);
  const [code, setCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [accountCreated, setAccountCreated] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useRevealAuthError(error);

  function previousOnboardingStep() {
    const index = ONBOARDING_STEPS.indexOf(onboardingStep);
    if (index <= 0) return false;
    setError(""); setOnboardingStep(ONBOARDING_STEPS[index - 1]); return true;
  }

  useAndroidBack(() => {
    if (loading) return true;
    if (phase === "identity") return false;
    if (phase === "account" && previousOnboardingStep()) return true;
    if (phase === "reset-complete") { navigate("/auth/login", { replace: true }); return true; }
    setError(""); setCode("");
    setForm(current => ({ ...current, password: "", confirmPassword: "" }));
    if (phase === "reset") { setPhase("existing"); return true; }
    setPhase(phase === "otp" ? "identity" : "otp");
    setAuthorization(""); setRequestToken(""); setResetReady(false);
    if (phase !== "otp") { setCooldown(0); setError("Demande un nouveau code pour vérifier à nouveau ton numéro."); }
    return true;
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const update = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const subjects = useMemo(() => cycle && form.schoolLevel ? revisionSubjectsForEducation(cycle, form.schoolLevel) : [], [cycle, form.schoolLevel]);

  async function run(action: () => Promise<void>) {
    setError(""); setLoading(true);
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Service momentanément indisponible."); }
    finally { setLoading(false); }
  }

  async function requestCode() {
    await run(async () => {
      const result = await requestRegistrationCode(form.phone);
      setRequestToken(result.requestToken); setCode(""); setCooldown(60); setPhase("otp");
    });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!requestToken) return setError("Demande un nouveau code pour vérifier ton numéro.");
    await run(async () => {
      const result = await checkVerificationCode({ phone: form.phone, code, requestToken });
      setAuthorization(result.authorization); setOnboardingStep("welcome");
      setPhase(result.accountExists ? "existing" : "account");
    });
  }

  function continueFromWelcome(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    setOnboardingStep("cycle");
  }

  function chooseCycle(nextCycle: SchoolCycle) {
    if (cycle !== nextCycle) {
      setForm((current) => ({ ...current, schoolLevel: "" }));
      setSubjectIds([]); setGuardianAcknowledged(false);
    }
    setCycle(nextCycle); setError(""); setOnboardingStep("class");
  }

  function chooseClass(level: string) {
    setForm((current) => ({ ...current, schoolLevel: level }));
    if (cycle) setSubjectIds((current) => compatibleSubjectIds(cycle, level, current));
    setError(""); setOnboardingStep("subjects");
  }

  function continueFromSubjects() {
    if (!subjectIds.length) return setError("Choisis au moins une matière.");
    setError(""); setOnboardingStep("confirmation");
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!cycle || !form.schoolLevel || !subjectIds.length) return setError("Complète ton parcours scolaire avant de continuer.");
    if (!accepted) return setError("Vous devez accepter les conditions d’utilisation.");
    if (cycle === "primary" && !guardianAcknowledged) return setError("Pour le primaire, réalise cette inscription avec un parent ou responsable légal.");
    await run(async () => {
      if (!accountCreated) {
        const registration = await registerElimaAccount({ role: "student", firstName: form.firstName, lastName: form.lastName, phone: form.phone, password: form.password, schoolLevel: form.schoolLevel, declaredSchoolName: form.declaredSchoolName, declaredSchoolCity: form.declaredSchoolCity, authorization });
        if (registration.session?.access_token) await completeElimaIdentitySession(registration.session);
        else await signInWithElimaPassword(form.phone, form.password, { recentSignup: true });
        setAccountCreated(true);
      }
      await saveRevisionOnboarding({ cycle, schoolLevelId: form.schoolLevel, subjectIds, guardianAcknowledged, declaredSchoolName: form.declaredSchoolName, declaredSchoolCity: form.declaredSchoolCity });
      navigate("/student", { replace: true });
    });
  }

  async function startReset() {
    await run(async () => {
      if (!resetReady) { setAuthorization(await exchangePhoneControlForReset({ phone: form.phone, authorization })); setResetReady(true); }
      setForm((current) => ({ ...current, password: "", confirmPassword: "" })); setPhase("reset");
    });
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (form.password !== form.confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    await run(async () => { await confirmPasswordReset({ phone: form.phone, authorization, password: form.password }); setPhase("reset-complete"); });
  }

  const card = (content: React.ReactNode, showProgress = false) => <main className="min-h-[100dvh] bg-[#f3f7f4] px-4 py-8 sm:px-6"><section className="mx-auto w-full max-w-2xl"><div className="flex items-center justify-between"><button type="button" onClick={() => showProgress && previousOnboardingStep() ? undefined : navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></button><ElimaLogo className="w-28" /><span className="w-11" /></div><div className="mt-8 rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(21,55,42,.1)] sm:p-9">{showProgress ? <OnboardingProgress step={onboardingStep} /> : null}{content}</div><LegalLinks className="mt-5 text-gray-500" /></section></main>;
  const title = (value: string, description?: React.ReactNode) => <><p className="text-sm font-semibold uppercase tracking-[.15em] text-revision">Elima Révision</p><h1 className="mt-2 font-title text-3xl font-semibold text-accent">{value}</h1>{description ? <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p> : null}</>;
  const errorMessage = error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null;

  if (phase === "identity") return card(<form onSubmit={(event) => { event.preventDefault(); void requestCode(); }}>{title("Créer mon compte élève")}<div className="mt-7 grid gap-4 sm:grid-cols-2"><Field name="firstName" autoComplete="given-name" label="Prénom" value={form.firstName} onChange={(value) => update("firstName", value)} required /><Field name="lastName" autoComplete="family-name" label="Nom" value={form.lastName} onChange={(value) => update("lastName", value)} required /></div><div className="mt-4"><Field name="phone" autoComplete="tel" label="Numéro WhatsApp" type="tel" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+225 05 00 00 00 00" required hint="Format international, ex. +225 05 00 00 00 00" /></div>{errorMessage}<PrimaryButton loading={loading}>Vérifier mon numéro</PrimaryButton></form>);
  if (phase === "otp") return card(<form onSubmit={verifyCode}>{title("Vérifier mon numéro", <>Nous avons envoyé un code sur WhatsApp au <strong>{form.phone}</strong>.</>)}<div className="mt-6"><Field name="verificationCode" autoComplete="one-time-code" label="Code de vérification" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="______" required /></div>{errorMessage}<PrimaryButton loading={loading}>Continuer</PrimaryButton><div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-semibold text-primary"><button type="button" disabled={loading || cooldown > 0} onClick={() => void requestCode()} className="disabled:text-gray-400">{cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}</button><button type="button" onClick={() => { setPhase("identity"); setRequestToken(""); setCode(""); setError(""); }}>Modifier le numéro</button></div></form>);
  if (phase === "existing") return card(<>{title("Numéro déjà associé", "Ce numéro est déjà associé à un compte Elima.")}<div className="mt-7 grid gap-3"><Link to="/auth/login" className="rounded-2xl bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white">Se connecter</Link><button type="button" disabled={loading} onClick={() => void startReset()} className="rounded-2xl border border-primary/20 px-5 py-3.5 text-sm font-semibold text-primary disabled:opacity-60">Réinitialiser mon mot de passe</button></div>{errorMessage}</>);
  if (phase === "reset-complete") return card(<>{title("Votre mot de passe a été modifié.", "Vous pouvez maintenant vous connecter.")}<Link to="/auth/login" className="mt-7 block rounded-2xl bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white">Se connecter</Link></>);
  if (phase === "reset") return card(<form onSubmit={resetPassword}>{title("Nouveau mot de passe")}<div className="mt-7 grid gap-4 sm:grid-cols-2"><Field name="password" autoComplete="new-password" label="Nouveau mot de passe" type="password" value={form.password} onChange={(value) => update("password", value)} required /><Field name="confirmPassword" autoComplete="new-password" label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} required /></div>{errorMessage}<PrimaryButton loading={loading}>Modifier mon mot de passe</PrimaryButton></form>);

  if (onboardingStep === "welcome") return card(<form onSubmit={continueFromWelcome}>{title("Bienvenue !", "Prépare ton espace de révision en quelques étapes.")}<div className="mt-6 rounded-3xl bg-gradient-to-br from-revision/10 to-primary/10 p-5"><Sparkles className="h-8 w-8 text-revision" /><p className="mt-3 font-title text-lg font-semibold text-accent">Un parcours adapté à ta classe</p><p className="mt-1 text-sm leading-6 text-gray-600">Choisis ton cycle, ta classe et les matières dans lesquelles tu veux progresser.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field name="password" autoComplete="new-password" label="Mot de passe" type="password" value={form.password} onChange={(value) => update("password", value)} required hint="8 caractères minimum" /><Field name="confirmPassword" autoComplete="new-password" label="Confirmer" type="password" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} required /></div>{errorMessage}<PrimaryButton loading={loading}>Configurer mon parcours</PrimaryButton></form>, true);
  if (onboardingStep === "cycle") return card(<>{title("Tu es dans quel cycle scolaire ?")}<div className="mt-7 grid gap-4 sm:grid-cols-2">{REVISION_EDUCATION_SYSTEM.cycles.map((item) => { const primary = item.id === "primary"; const Icon = primary ? School : GraduationCap; return <button key={item.id} type="button" aria-pressed={cycle === item.id} onClick={() => chooseCycle(item.id)} className={`group min-h-44 rounded-3xl border-2 p-6 text-left transition focus:outline-none focus:ring-4 focus:ring-revision/20 ${cycle === item.id ? "border-revision bg-revision/[.06]" : "border-gray-100 hover:border-revision/30"}`}><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${primary ? "bg-amber-100 text-amber-700" : "bg-revision/10 text-revision"}`}><Icon className="h-7 w-7" /></span><span className="mt-5 block font-title text-xl font-semibold text-accent">{item.label}</span><span className="mt-2 block text-sm leading-6 text-gray-500">{item.description}</span></button>; })}</div>{errorMessage}</>, true);
  if (onboardingStep === "class" && cycle) return card(<>{title("Choisis ta classe", cycle === "primary" ? "CM1 ou CM2" : "Collège ou lycée")}<div className={`mt-7 grid gap-3 ${cycle === "primary" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>{studentClassesForCycle(cycle).map((level) => <button key={level} type="button" aria-pressed={form.schoolLevel === level} onClick={() => chooseClass(level)} className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${form.schoolLevel === level ? "border-revision bg-revision text-white" : "border-gray-200 text-accent hover:border-revision/40"}`}>{level}</button>)}</div>{errorMessage}</>, true);
  if (onboardingStep === "subjects" && cycle) return card(<>{title("Choisis tes matières", cycle === "primary" ? "Tu peux en choisir une ou plusieurs." : "Dans quelles matières souhaites-tu progresser ?")}<div className="mt-7 grid gap-3 sm:grid-cols-2">{subjects.map((item) => { const selected = subjectIds.includes(item.id); const planned = item.availability === "planned"; return <button key={item.id} type="button" disabled={planned} aria-pressed={selected} onClick={() => setSubjectIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`min-h-20 rounded-2xl border p-4 text-left transition ${planned ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400" : selected ? "border-revision bg-revision text-white" : "border-gray-200 text-accent hover:border-revision/40"}`}><span className="flex items-center justify-between gap-3"><strong>{item.label}</strong>{selected ? <Check className="h-5 w-5" /> : null}{planned ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Bientôt disponible</span> : null}</span>{item.domains.length ? <span className={`mt-2 block text-xs leading-5 ${selected ? "text-white/75" : "text-gray-500"}`}>{item.domains.map((entry) => entry.label).join(" · ")}</span> : null}</button>; })}</div>{errorMessage}<PrimaryButton loading={loading} disabled={!subjectIds.length} onClick={continueFromSubjects}>Continuer</PrimaryButton></>, true);

  return card(<form onSubmit={createAccount}>{title("Tout est prêt", "Vérifie tes choix avant de commencer.")}<dl className="mt-7 space-y-3 rounded-3xl bg-gray-50 p-5 text-sm"><SummaryRow label="Cycle" value={cycle === "primary" ? "Primaire" : "Secondaire"} onEdit={() => setOnboardingStep("cycle")} /><SummaryRow label="Classe" value={form.schoolLevel} onEdit={() => setOnboardingStep("class")} /><SummaryRow label="Matières" value={subjects.filter((subject) => subjectIds.includes(subject.id)).map((subject) => subject.label).join(", ")} onEdit={() => setOnboardingStep("subjects")} /></dl><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field name="declaredSchoolName" autoComplete="organization" label="École (facultatif)" value={form.declaredSchoolName} onChange={(value) => update("declaredSchoolName", value)} /><Field name="declaredSchoolCity" autoComplete="address-level2" label="Ville (facultatif)" value={form.declaredSchoolCity} onChange={(value) => update("declaredSchoolCity", value)} /></div>{cycle === "primary" ? <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><input type="checkbox" checked={guardianAcknowledged} onChange={(event) => setGuardianAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-revision" /><span><strong className="block">À faire avec un adulte</strong>Je confirme réaliser cette inscription avec un parent ou responsable légal. Aucun nom ni contact supplémentaire n’est demandé.</span></label> : null}<label className="mt-5 flex items-start gap-3 text-xs leading-5 text-gray-500"><input name="acceptTerms" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>J’accepte les conditions d’utilisation et la politique de confidentialité d’Elima.</span></label>{accountCreated && error ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Ton compte est créé. Tes choix n’ont pas encore été enregistrés : tu peux réessayer sans recréer le compte.</p> : null}{errorMessage}<PrimaryButton loading={loading}>{accountCreated ? "Réessayer l’enregistrement" : "Commencer mes révisions"}</PrimaryButton></form>, true);
}

function OnboardingProgress({ step }: { step: OnboardingStep }) {
  const index = ONBOARDING_STEPS.indexOf(step);
  return <div className="mb-6" aria-label={`Étape ${index + 1} sur ${ONBOARDING_STEPS.length}`}><div className="flex gap-1.5" aria-hidden>{ONBOARDING_STEPS.map((item, itemIndex) => <span key={item} className={`h-1.5 flex-1 rounded-full ${itemIndex <= index ? "bg-revision" : "bg-gray-100"}`} />)}</div><p className="mt-2 text-right text-[11px] font-semibold text-gray-400">Étape {index + 1}/{ONBOARDING_STEPS.length}</p></div>;
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="flex items-start gap-3"><dt className="w-20 shrink-0 text-gray-500">{label}</dt><dd className="min-w-0 flex-1 font-semibold text-accent">{value}</dd><button type="button" onClick={onEdit} className="text-xs font-semibold text-revision">Modifier</button></div>;
}

function PrimaryButton({ loading, disabled, onClick, children }: { loading: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={loading || disabled} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-revision px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-revision/20 disabled:opacity-50">{loading ? "Enregistrement…" : <>{children}<ArrowRight className="h-4 w-4" /></>}</button>;
}

function Field({ name, autoComplete, label, value, onChange, type = "text", required, hint, placeholder, inputMode }: { name: string; autoComplete: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; hint?: string; placeholder?: string; inputMode?: "numeric" }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input name={name} autoComplete={autoComplete} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-primary" />{hint ? <span className="mt-1.5 block text-xs font-normal text-gray-400">{hint}</span> : null}</label>;
}
