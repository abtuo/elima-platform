"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PhonePasswordLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+225');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/password/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Connexion indisponible.');
      router.replace(body.redirectTo || '/student');
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Connexion momentanément indisponible.'); }
    finally { setLoading(false); }
  }
  return <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-4 py-8">
    <section className="elima-card mx-auto w-full max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">Connexion Elima</h1>
      <p className="text-sm text-slate-600">Votre numéro WhatsApp et votre mot de passe suffisent.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">Numéro WhatsApp
          <input type="tel" name="phone" autoComplete="username" required value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
        </label>
        <label className="block text-sm">Mot de passe
          <input type="password" name="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[var(--primary)] p-3 font-semibold text-white disabled:opacity-60">{loading ? 'Connexion…' : 'Se connecter'}</button>
      </form>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/signup/student">Créer un compte</Link>
        <Link href="/reset-password">Mot de passe oublié ?</Link>
      </div>
      <p className="text-xs text-slate-500">Après inscription ou réinitialisation sur Elima Mobile, revenez vous connecter ici.</p>
      <div className="flex gap-4 text-sm"><Link href="/login/email">Accès scolaire par email</Link><Link href="/login/teacher-code">Code enseignant</Link></div>
    </section>
  </main>;
}
