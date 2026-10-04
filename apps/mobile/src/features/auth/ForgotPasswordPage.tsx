import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { confirmPasswordReset, requestPasswordResetCode } from "@/services/registrationService";

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  const verificationPhone = identifier;

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await requestPasswordResetCode({ identifier, phone: verificationPhone });
      if (!result.challengeId) throw new Error("Demande impossible.");
      setChallengeId(result.challengeId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Demande impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Saisissez le code à 6 chiffres reçu sur WhatsApp.");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      await confirmPasswordReset({ identifier, phone: verificationPhone, challengeId, code, password });
      setCompleted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Réinitialisation impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (completed) return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-14 w-14 text-primary" /><h1 className="mt-5 font-title text-2xl font-semibold text-accent">Mot de passe modifié</h1><p className="mt-3 text-sm leading-6 text-gray-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p><Link to="/auth/login" className="mt-6 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white">Se connecter</Link></section></main>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(21,55,42,.12)] sm:p-9">
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500"><ArrowLeft className="h-4 w-4" />Connexion</Link>
        <ElimaLogo className="mx-auto mt-5 w-28" />
        <div className="mt-7 text-center"><KeyRound className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-3 font-title text-2xl font-semibold text-accent">Mot de passe oublié</h1><p className="mt-2 text-sm leading-6 text-gray-500">Nous vérifierons votre numéro WhatsApp avant de modifier le mot de passe.</p></div>

        {!challengeId ? <form onSubmit={requestCode} className="mt-7 space-y-4"><Field label="Numéro WhatsApp du compte" value={identifier} onChange={setIdentifier} placeholder="+225 05 00 00 00 00" autoComplete="username" />{identifier.includes("@") ? <Field label="Numéro WhatsApp associé" value={phone} onChange={setPhone} placeholder="+225..." autoComplete="tel" /> : null}{error ? <ErrorMessage message={error} /> : null}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Envoi…" : <>Recevoir le code <Send className="h-4 w-4" /></>}</button></form> : <form onSubmit={resetPassword} className="mt-7 space-y-4"><p className="rounded-2xl bg-primary/[.05] px-4 py-3 text-xs leading-5 text-gray-600">Si les informations correspondent à un compte, un code a été envoyé au {verificationPhone}.</p><Field label="Code WhatsApp" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" /><Field label="Nouveau mot de passe" value={password} onChange={setPassword} type="password" autoComplete="new-password" /><Field label="Confirmer le mot de passe" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" />{error ? <ErrorMessage message={error} /> : null}<button disabled={loading} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Modification…" : "Modifier le mot de passe"}</button><button type="button" onClick={() => { setChallengeId(""); setCode(""); setError(""); }} className="w-full text-sm font-semibold text-primary">Modifier les informations</button></form>}
      </section>
    </main>
  );
}
function Field({ label, value, onChange, type = "text", placeholder, autoComplete, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoComplete?: string; inputMode?: "numeric" }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-primary" /></label>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{message}</p>;
}
