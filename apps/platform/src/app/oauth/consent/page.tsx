import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OAuthConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const authorizationId = (await searchParams).authorization_id?.trim();
  if (!authorizationId) return <ConsentError message="Demande d’autorisation incomplète." />;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    const target = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login/email?redirect=${encodeURIComponent(target)}`);
  }

  const { data: details, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) return <ConsentError message={error?.message ?? "Demande d’autorisation invalide ou expirée."} />;
  if (!("authorization_id" in details)) redirect(details.redirect_url);

  const scopes = String(details.scope ?? "").split(" ").filter(Boolean);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <section className="elima-card mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Compte Elima</p>
          <h1 className="text-2xl font-bold text-[var(--accent)]">Ouvrir {details.client.name}</h1>
          <p className="text-sm leading-6 text-slate-600">Cette application souhaite utiliser ton identité Elima pour te connecter sans nouveau mot de passe.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Informations partagées</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {scopes.includes("email") ? <li>Adresse email vérifiée</li> : null}
            {scopes.includes("profile") ? <li>Nom et profil Elima</li> : null}
            {scopes.includes("openid") ? <li>Identifiant Elima sécurisé</li> : null}
          </ul>
        </div>
        <form action="/api/oauth/decision" method="post" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <button type="submit" name="decision" value="deny" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Annuler</button>
          <button type="submit" name="decision" value="approve" className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white">Continuer</button>
        </form>
      </section>
    </main>
  );
}

function ConsentError({ message }: { message: string }) {
  return <main className="flex min-h-screen items-center justify-center px-4"><section className="elima-card max-w-md text-center"><h1 className="text-xl font-bold text-slate-900">Autorisation impossible</h1><p className="mt-3 text-sm text-slate-600">{message}</p></section></main>;
}
