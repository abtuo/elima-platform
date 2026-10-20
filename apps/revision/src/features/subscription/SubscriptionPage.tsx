import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppHeader } from "@/components/common/AppHeader";
import {
  subscriptionRequest,
  isPlayBillingAvailable,
  PlayBilling,
  choosePlayOffer,
  restorePlayPurchases,
  type Entitlement,
  type PlayProduct,
  type Feature,
  type Plan,
} from "@/services/subscriptionService";

const labels: Record<Feature, string> = {
  ai_quiz: "Quiz IA",
  ai_flashcard: "Fiches générées",
  document_scan: "Scanner",
  ai_hint: "Indices IA",
};

const planFeatures: Record<Plan, string[]> = {
  free: ["2 quiz IA par jour", "2 fiches et 2 scans par semaine", "5 indices IA par jour"],
  standard: ["10 quiz IA par jour", "3 fiches et 3 scans par jour", "25 indices IA par jour"],
  premium: ["500 quiz IA par jour", "200 fiches et 100 scans par jour", "1 000 indices IA par jour"],
};

function effectiveLimit(item: Entitlement["usage"][Feature]) {
  if (item.limit !== null) return item.limit;
  const inferred = item.used + item.remaining;
  return Number.isFinite(inferred) ? inferred : null;
}

function UsageList({ data }: { data: Entitlement }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {Object.entries(data.usage).map(([feature, item]) => {
        const limit = effectiveLimit(item);
        return (
          <li key={feature} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
            <span>{labels[feature as Feature]}</span>
            <span className="break-words text-gray-600 sm:text-right">
              {item.used} utilisé{item.used > 1 ? "s" : ""}{limit === null ? "" : ` sur ${limit}`} / {item.period === "week" ? "semaine" : "jour"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function SubscriptionSummary() {
  const [data, setData] = useState<Entitlement | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    subscriptionRequest()
      .then((value) => { if (active) setData(value); })
      .catch(() => { if (active) setError("Abonnement indisponible pour le moment."); });
    return () => { active = false; };
  }, []);
  return (
    <section className="card mt-5 min-w-0 p-5">
      <h2 className="font-title text-lg font-semibold">Mon abonnement</h2>
      {data ? <><p className="mt-2 capitalize text-revision">{data.plan}</p><UsageList data={data} /></> : <p className="mt-2 text-sm text-gray-500">{error || "Chargement…"}</p>}
      <Link to="/student/abonnement" className="mt-3 inline-block text-sm font-semibold text-revision">Voir les offres et gérer mes achats →</Link>
    </section>
  );
}

export function SubscriptionPage() {
  const [data, setData] = useState<Entitlement | null>(null);
  const [products, setProducts] = useState<PlayProduct[]>([]);
  const [rightsLoading, setRightsLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [rightsError, setRightsError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const native = isPlayBillingAvailable();

  const loadRights = useCallback(async () => {
    setRightsLoading(true);
    setRightsError("");
    try { setData(await subscriptionRequest()); }
    catch (error) { setRightsError(error instanceof Error ? error.message : "Droits indisponibles pour le moment."); }
    finally { setRightsLoading(false); }
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!native) return;
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const result = await PlayBilling.catalog();
      setProducts(result.products);
      const missing = ["elima_revision_standard", "elima_revision_premium"].filter((id) => !result.products.some((product) => product.productId === id));
      if (missing.length) setCatalogError("Certaines offres ne sont pas disponibles pour ce compte Google Play.");
    } catch {
      setCatalogError("Offres Google Play indisponibles. Vérifie l’installation depuis Google Play, le compte test et la connexion.");
    } finally { setCatalogLoading(false); }
  }, [native]);

  useEffect(() => { void loadRights(); void loadCatalog(); }, [loadCatalog, loadRights]);

  async function purchase(productId: string, offerToken: string) {
    if (!data || !data.billingAvailable || !data.accountId || busy) return;
    setBusy(true); setActionError(""); setMessage("");
    try {
      const current = await subscriptionRequest(); setData(current);
      if (!current.billingAvailable || !current.accountId) throw new Error("La vérification Google Play n’est pas encore configurée côté serveur.");
      const offer = choosePlayOffer(products.find((product) => product.productId === productId), current.trialUsed, current.plan);
      if (!offer || offer.token !== offerToken) throw new Error("Les offres ont changé. Recharge les tarifs et réessaie.");
      const result = await PlayBilling.purchase({ productId, offerToken, accountId: current.accountId });
      if (!result.purchases.length) { setMessage("Achat en attente de validation par Google Play. Restaure tes achats après confirmation."); return; }
      for (const item of result.purchases) await subscriptionRequest({ action: "verify", purchaseToken: item.purchaseToken });
      setData(await subscriptionRequest()); setMessage("Abonnement vérifié. Tes droits sont à jour.");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Achat indisponible."); }
    finally { setBusy(false); }
  }

  async function restore() {
    setBusy(true); setActionError(""); setMessage("");
    try { setData(await restorePlayPurchases()); setMessage("Achats restaurés et vérifiés."); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Restauration indisponible."); }
    finally { setBusy(false); }
  }

  const managesPlaySubscription = Boolean(data && (data.plan !== "free" || data.currentPeriodEnd));
  return (
    <PageContainer>
      <AppHeader title="Mon abonnement" subtitle="Révise à ton rythme" accent="#7C3AED" />

      {actionError && <p role="alert" className="mb-4 break-words rounded-2xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
      {message && <p role="status" className="mb-4 rounded-2xl bg-green-50 p-4 text-sm text-primary">{message}</p>}

      {rightsLoading ? <p className="mb-5 text-sm text-gray-600">Chargement de tes droits…</p> : rightsError ? (
        <section className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="break-words">{rightsError}</p>
          <button type="button" onClick={() => void loadRights()} className="mt-3 font-semibold underline">Réessayer</button>
        </section>
      ) : data ? (
        <section className="card mb-5 min-w-0 p-5">
          <p className="font-semibold capitalize">Offre actuelle : {data.plan}</p>
          <UsageList data={data} />
          {data.currentPeriodEnd && <p className="mt-3 text-xs text-gray-500">Fin de période : {new Date(data.currentPeriodEnd).toLocaleDateString("fr-FR")}{!data.autoRenewing ? " · renouvellement désactivé" : ""}</p>}
        </section>
      ) : null}

      {native && data?.billingAvailable === false && (
        <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Les achats sont temporairement indisponibles. Tes droits et ton historique restent accessibles.</p>
      )}
      {catalogError && (
        <section role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p>{catalogError}</p>
          <button type="button" onClick={() => void loadCatalog()} className="mt-3 font-semibold underline">Recharger les tarifs</button>
        </section>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {(["free", "standard", "premium"] as const).map((plan) => {
          const productId = `elima_revision_${plan}`;
          const product = products.find((candidate) => candidate.productId === productId);
          const offer = data ? choosePlayOffer(product, data.trialUsed, data.plan) : undefined;
          const paidPhase = offer?.phases.at(-1);
          const trial = offer?.phases[0]?.micros === 0;
          const canBuy = Boolean(native && data?.billingAvailable && data.accountId && offer && !busy && data.plan !== plan);
          const price = plan === "free" ? "0 FCFA" : paidPhase
            ? `${paidPhase.price} / mois`
            : native ? (catalogLoading ? "Chargement du tarif…" : "Tarif indisponible") : "Tarif affiché dans l’application Android";
          return (
            <section key={plan} className="card flex min-w-0 flex-col p-5">
              <h2 className="font-title text-xl font-bold capitalize">{plan}</h2>
              <p className="mt-3 break-words font-semibold text-revision">{price}</p>
              {trial && <p className="mt-1 text-sm text-gray-600">1 mois offert, puis {paidPhase?.price} par mois.</p>}
              <ul className="my-4 flex-1 space-y-2 text-sm">
                <li>Quiz enregistrés, progression et historique inclus</li>
                {planFeatures[plan].map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              {plan !== "free" && (
                <>
                  <p className="mb-3 text-xs text-gray-500">Abonnement mensuel renouvelé automatiquement. Annulation possible dans Google Play.</p>
                  <button type="button" disabled={!canBuy} onClick={() => offer && void purchase(productId, offer.token)} className="w-full rounded-2xl bg-revision px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
                    {data?.plan === plan ? "Offre actuelle" : `Passer à ${plan === "standard" ? "Standard" : "Premium"}`}
                  </button>
                </>
              )}
            </section>
          );
        })}
      </div>

      {native && data?.plan === "standard" && products.length > 0 && <p className="mt-4 text-sm text-gray-600">Le passage à Premium prend effet immédiatement selon les conditions affichées par Google Play.</p>}
      {native && data?.plan === "premium" && products.length > 0 && <p className="mt-4 text-sm text-gray-600">Le passage à Standard prend effet à la prochaine échéance.</p>}
      {!native ? (
        <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">Pour acheter ou restaurer un abonnement, ouvre Elima Révision installé depuis Google Play sur Android.</p>
      ) : (
        <div className="mt-5 flex min-w-0 flex-col items-start gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" disabled={busy || data?.billingAvailable === false} onClick={() => void restore()} className="max-w-full rounded-2xl border px-4 py-2 text-sm font-semibold disabled:opacity-40">Restaurer mes achats</button>
          {managesPlaySubscription && <a className="max-w-full break-words text-sm font-semibold text-revision" href="https://play.google.com/store/account/subscriptions?package=ci.elima.revision" target="_blank" rel="noreferrer">Gérer ou annuler dans Google Play</a>}
        </div>
      )}
    </PageContainer>
  );
}
