"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";

type Mode = "login" | "signup" | "password_reset" | "activation";
type Stage = "details" | "otp" | "password";

const titles: Record<Mode, string> = {
  login: "Heureux de vous revoir",
  signup: "Créer mon compte",
  password_reset: "Mot de passe oublié",
  activation: "Activer mon accès",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [stage, setStage] = useState<Stage>("details");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [completionAction, setCompletionAction] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function destination() {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/compte";
  }

  function selectMode(next: Mode) {
    setMode(next); setStage("details"); setPassword(""); setConfirmPassword(""); setToken(""); setMessage(""); setPhoneError("");
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!phone) return setPhoneError("Vérifiez le numéro saisi.");
    setBusy(true); setMessage(""); setPhoneError("");
    const response = await fetch("/api/auth/password/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, password }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.message || "Connexion impossible.");
    router.push(destination()); router.refresh();
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!phone) return setPhoneError("Vérifiez le numéro saisi.");
    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) return setMessage("Saisissez votre prénom et votre nom.");
    setBusy(true); setMessage(""); setPhoneError("");
    const response = await fetch("/api/auth/phone/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, flow: mode }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.message || "Le code n’a pas pu être envoyé.");
    setPhone(data.phone); setRequestToken(data.requestToken); setStage("otp");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/auth/phone/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, token, requestToken, flow: mode }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.message || "Code invalide ou expiré.");
    setAuthorization(data.authorization); setCompletionAction(data.action); setStage("password");
  }

  async function complete(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setMessage("Choisissez un mot de passe d’au moins 8 caractères.");
    if (password !== confirmPassword) return setMessage("Les mots de passe ne correspondent pas.");
    setBusy(true); setMessage("");
    const response = await fetch("/api/auth/password/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, password, authorization, action: completionAction, firstName, lastName }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) {
      if (response.status === 409) { selectMode("login"); return setMessage(data.message); }
      return setMessage(data.message || "Le mot de passe n’a pas pu être enregistré.");
    }
    router.push(destination()); router.refresh();
  }

  return <div className="relative grid min-h-[70vh] place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#edf8f1,transparent_45%)] px-4 py-10 sm:py-14">
    <div className="store-card w-full max-w-[470px] p-6 shadow-[0_24px_70px_rgba(23,63,46,.10)] sm:p-9">
      <div className="flex justify-center"><Image src="/logo.png" alt="Elima" width={150} height={54} priority className="h-12 w-auto" /></div>
      <div className="mt-6 text-center"><h1 className="text-3xl font-bold text-[#173f2e]">{stage === "otp" ? "Vérifiez votre numéro" : stage === "password" ? "Choisissez votre mot de passe" : titles[mode]}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{stage === "otp" ? `Saisissez le code envoyé au ${phone}.` : stage === "password" ? "Votre numéro est vérifié. Définissez maintenant votre accès sécurisé." : mode === "login" ? "Connectez-vous simplement avec votre téléphone et votre mot de passe." : "La vérification de votre numéro protège votre compte."}</p></div>

      {stage === "details" && mode === "login" && <form onSubmit={login} className="mt-7 space-y-4">
        <PhoneNumberInput value={phone} onChange={setPhone} disabled={busy} error={phoneError} />
        <PasswordField value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="current-password" />
        <button disabled={busy} className="primary-button">{busy && <LoaderCircle className="animate-spin" size={18} />}Se connecter</button>
        <button type="button" onClick={() => selectMode("password_reset")} className="w-full text-sm font-semibold text-[#1a5f3f]">Mot de passe oublié ?</button>
      </form>}

      {stage === "details" && mode !== "login" && <form onSubmit={sendCode} className="mt-7 space-y-4">
        {mode === "signup" && <div className="grid gap-3 sm:grid-cols-2"><TextField label="Prénom" value={firstName} onChange={setFirstName} autoComplete="given-name" /><TextField label="Nom" value={lastName} onChange={setLastName} autoComplete="family-name" /></div>}
        <PhoneNumberInput value={phone} onChange={setPhone} disabled={busy} error={phoneError} />
        <button disabled={busy} className="primary-button">{busy && <LoaderCircle className="animate-spin" size={18} />}Recevoir mon code</button>
      </form>}

      {stage === "otp" && <form onSubmit={verifyCode} className="mt-7">
        <label htmlFor="otp" className="text-sm font-bold">Code de vérification</label>
        <input id="otp" value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required className="mt-2 h-14 w-full rounded-xl border px-4 text-center text-2xl tracking-[.35em] outline-none focus:border-[#2e8b57] focus:ring-2 focus:ring-[#2e8b57]/15" />
        <button disabled={busy || token.length < 4} className="primary-button mt-5">{busy && <LoaderCircle className="animate-spin" size={18} />}Vérifier mon numéro</button>
        <button type="button" onClick={() => setStage("details")} className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} />Modifier le numéro</button>
      </form>}

      {stage === "password" && <form onSubmit={complete} className="mt-7 space-y-4">
        <PasswordField value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" label="Nouveau mot de passe" />
        <PasswordField value={confirmPassword} onChange={setConfirmPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" label="Confirmer le mot de passe" />
        <p className="flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={17} className="shrink-0 text-[#2e8b57]" />Au moins 8 caractères. Votre mot de passe reste géré par le service d’identité sécurisé Elima.</p>
        <button disabled={busy} className="primary-button">{busy && <LoaderCircle className="animate-spin" size={18} />}Enregistrer et continuer</button>
      </form>}

      {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}

      {stage === "details" && <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm">
        {mode === "login" ? <><span className="text-slate-500">Nouveau sur Elima Store ? </span><button onClick={() => selectMode("signup")} className="font-bold text-[#2e8b57]">Créer un compte</button><button onClick={() => selectMode("activation")} className="mt-3 block w-full text-xs font-semibold text-slate-500">Activer mon accès par mot de passe</button></> : <button onClick={() => selectMode("login")} className="font-bold text-[#2e8b57]">← Retour à la connexion</button>}
      </div>}
    </div>
  </div>;
}

function PasswordField({ value, onChange, show, onToggle, autoComplete, label = "Mot de passe" }: { value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; autoComplete: string; label?: string }) {
  return <label className="block text-sm font-bold">{label}<span className="relative mt-2 block"><LockKeyhole size={18} className="absolute left-3 top-3.5 text-slate-400" /><input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required className="h-12 w-full rounded-xl border border-slate-300 pl-10 pr-12 font-normal outline-none focus:border-[#2e8b57] focus:ring-2 focus:ring-[#2e8b57]/15" /><button type="button" onClick={onToggle} className="absolute right-2 top-2 grid h-8 w-8 place-items-center text-slate-500" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>;
}

function TextField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return <label className="text-sm font-bold">{label}<input value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-[#2e8b57] focus:ring-2 focus:ring-[#2e8b57]/15" /></label>;
}
