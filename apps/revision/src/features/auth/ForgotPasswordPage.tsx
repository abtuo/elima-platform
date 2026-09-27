import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { ElimaLogo } from "@/components/common/ElimaLogo";
import { checkVerificationCode, confirmPasswordReset, requestPasswordResetCode } from "@/services/registrationService";

type Phase = "phone" | "otp" | "password" | "complete";

export function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function run(action: () => Promise<void>) {
    setError(""); setLoading(true);
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Service momentanément indisponible."); }
    finally { setLoading(false); }
  }

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    await run(async () => {
      const result = await requestPasswordResetCode(phone);
      setRequestToken(result.requestToken);
      setCode("");
      setCooldown(60);
      setPhase("otp");
    });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await checkVerificationCode({ phone, code, requestToken });
      if (!result.accountExists || result.purpose !== "password_reset") throw new Error("Aucun compte Elima ne correspond à ce numéro.");
      setAuthorization(result.authorization);
      setPhase("password");
    });
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    await run(async () => {
      await confirmPasswordReset({ phone, authorization, password });
      setPhase("complete");
    });
  }

  if (phase === "complete") return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-14 w-14 text-primary" /><h1 className="mt-5 font-title text-2xl font-semibold text-accent">Votre mot de passe a été modifié.</h1><p className="mt-3 text-sm leading-6 text-gray-500">Vous pouvez maintenant vous connecter.</p><Link to="/auth/login" className="mt-6 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white">Se connecter</Link></section></main>;

  return <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] px-4 py-8"><section className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(21,55,42,.12)] sm:p-9"><Link to="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500"><ArrowLeft className="h-4 w-4" />Connexion</Link><ElimaLogo className="mx-auto mt-5 w-28" /><div className="mt-7 text-center"><KeyRound className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-3 font-title text-2xl font-semibold text-accent">Mot de passe oublié</h1><p className="mt-2 text-sm leading-6 text-gray-500">Vérifiez votre numéro WhatsApp pour choisir un nouveau mot de passe.</p></div>
    {phase === "phone" ? <form onSubmit={requestCode} className="mt-7 space-y-4"><Field name="phone" label="Numéro WhatsApp" type="tel" value={phone} onChange={setPhone} placeholder="+225 05 00 00 00 00" autoComplete="tel" />{error ? <ErrorMessage message={error} /> : null}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Envoi…" : <>Recevoir un code <Send className="h-4 w-4" /></>}</button></form> : null}
    {phase === "otp" ? <form onSubmit={verifyCode} className="mt-7 space-y-4"><p className="rounded-2xl bg-primary/[.05] px-4 py-3 text-xs leading-5 text-gray-600">Un code a été envoyé sur WhatsApp au {phone}.</p><Field name="verificationCode" label="Code reçu sur WhatsApp" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 10))} placeholder="______" inputMode="numeric" autoComplete="one-time-code" />{error ? <ErrorMessage message={error} /> : null}<button disabled={loading} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Vérification…" : "Continuer"}</button><button type="button" disabled={loading || cooldown > 0} onClick={() => void requestCode()} className="w-full text-sm font-semibold text-primary disabled:text-gray-400">{cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}</button><button type="button" onClick={() => { setPhase("phone"); setRequestToken(""); setCode(""); setError(""); }} className="w-full text-sm font-semibold text-primary">Modifier le numéro</button></form> : null}
    {phase === "password" ? <form onSubmit={resetPassword} className="mt-7 space-y-4"><Field name="password" label="Nouveau mot de passe" value={password} onChange={setPassword} type="password" autoComplete="new-password" /><Field name="confirmPassword" label="Confirmer le mot de passe" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" />{error ? <ErrorMessage message={error} /> : null}<button disabled={loading} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Modification…" : "Modifier mon mot de passe"}</button></form> : null}
  </section></main>;
}

function Field({ name, label, value, onChange, type = "text", placeholder, autoComplete, inputMode }: { name: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoComplete: string; inputMode?: "numeric" }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><input name={name} required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-primary" /></label>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-danger">{message}</p>;
}
