package ci.elima.revision;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;

/** Only Google UI makes purchases. Entitlements are never granted here. */
@CapacitorPlugin(name = "RevisionBilling")
public class RevisionBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billing;
    private PluginCall purchaseCall;
    private final Map<String, ProductDetails> products = new HashMap<>();
    private static final List<String> IDS = Arrays.asList("elima_revision_standard", "elima_revision_premium");

    @Override public void load() {
        billing = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void ready(PluginCall call, Runnable run) {
        getActivity().runOnUiThread(() -> {
            if (billing.isReady()) { run.run(); return; }
            billing.startConnection(new BillingClientStateListener() {
                @Override public void onBillingSetupFinished(BillingResult result) {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) run.run();
                    else call.reject("Google Play indisponible. Installe l’application depuis Google Play.", "billing_unavailable");
                }
                @Override public void onBillingServiceDisconnected() {}
            });
        });
    }
    @PluginMethod public void catalog(PluginCall call) {
        ready(call, () -> {
            List<QueryProductDetailsParams.Product> query = new ArrayList<>();
            for (String id : IDS) query.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
            billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(query).build(), (result, details) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Offres indisponibles."); return; }
                JSArray rows = new JSArray();
                products.clear();
                for (ProductDetails product : details.getProductDetailsList()) {
                    products.put(product.getProductId(), product);
                    JSArray offers = new JSArray();
                    if (product.getSubscriptionOfferDetails() != null) for (ProductDetails.SubscriptionOfferDetails offer : product.getSubscriptionOfferDetails()) {
                        if (!"monthly".equals(offer.getBasePlanId())) continue;
                        JSArray phases = new JSArray();
                        for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
                            JSObject p = new JSObject();
                            p.put("price", phase.getFormattedPrice()); p.put("micros", phase.getPriceAmountMicros());
                            p.put("period", phase.getBillingPeriod()); p.put("cycles", phase.getBillingCycleCount());
                            phases.put(p);
                        }
                        JSObject o = new JSObject(); o.put("token", offer.getOfferToken()); o.put("offerId", offer.getOfferId()); o.put("phases", phases); offers.put(o);
                    }
                    JSObject row = new JSObject(); row.put("productId", product.getProductId()); row.put("offers", offers); rows.put(row);
                }
                JSObject output = new JSObject(); output.put("products", rows); call.resolve(output);
            });
        });
    }
    private JSArray tokens(List<Purchase> purchases) {
        JSArray values = new JSArray();
        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED || Collections.disjoint(purchase.getProducts(), IDS)) continue;
            JSObject row = new JSObject(); row.put("purchaseToken", purchase.getPurchaseToken()); row.put("products", new JSArray(purchase.getProducts())); values.put(row);
        }
        return values;
    }
    private void rejectPurchase(PluginCall call, String message) {
        purchaseCall = null;
        call.reject(message);
    }
    @PluginMethod public void restore(PluginCall call) {
        ready(call, () -> billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (result, purchases) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Restauration indisponible."); return; }
            JSObject output = new JSObject(); output.put("purchases", tokens(purchases)); call.resolve(output);
        }));
    }
    @PluginMethod public void purchase(PluginCall call) {
        ready(call, () -> {
            if (purchaseCall != null) { call.reject("Un achat est déjà en cours."); return; }
            String id = call.getString("productId"), offerToken = call.getString("offerToken"), account = call.getString("accountId");
            ProductDetails product = products.get(id);
            if (product == null || offerToken == null || account == null || !account.matches("[0-9a-f]{64}")) { call.reject("Recharge les offres avant de réessayer."); return; }
            boolean found = product.getSubscriptionOfferDetails() != null && product.getSubscriptionOfferDetails().stream().anyMatch(o -> o.getOfferToken().equals(offerToken));
            if (!found) { call.reject("Offre invalide."); return; }
            purchaseCall = call;
            // Query Google again: never start a second concurrent subscription.
            billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (result, owned) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { rejectPurchase(call, "Impossible de vérifier les achats existants."); return; }
                List<Purchase> relevant = new ArrayList<>();
                for (Purchase p : owned) if (!Collections.disjoint(p.getProducts(), IDS)) relevant.add(p);
                if (relevant.size() > 1) { rejectPurchase(call, "Restaure tes achats avant de changer d’offre."); return; }
                BillingFlowParams.Builder flow = BillingFlowParams.newBuilder().setObfuscatedAccountId(account)
                    .setProductDetailsParamsList(Collections.singletonList(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offerToken).build()));
                if (!relevant.isEmpty()) {
                    Purchase previous = relevant.get(0);
                    if (previous.getPurchaseState() != Purchase.PurchaseState.PURCHASED) { rejectPurchase(call, "Un achat est en attente."); return; }
                    if (previous.getProducts().contains(id)) { rejectPurchase(call, "Cet abonnement existe déjà. Restaure tes achats."); return; }
                    if (previous.getAccountIdentifiers() == null || !account.equals(previous.getAccountIdentifiers().getObfuscatedAccountId())) { rejectPurchase(call, "Cet achat appartient à un autre compte Elima."); return; }
                    int mode = id.equals("elima_revision_premium") ? BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION : BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.DEFERRED;
                    flow.setSubscriptionUpdateParams(BillingFlowParams.SubscriptionUpdateParams.newBuilder().setOldPurchaseToken(previous.getPurchaseToken()).setSubscriptionReplacementMode(mode).build());
                }
                purchaseCall = call;
                getActivity().runOnUiThread(() -> {
                    BillingResult launched = billing.launchBillingFlow(getActivity(), flow.build());
                    if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) { purchaseCall = null; call.reject("Impossible de démarrer l’achat."); }
                });
            });
        });
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = purchaseCall; purchaseCall = null;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            JSObject output = new JSObject(); output.put("purchases", tokens(purchases));
            if (call != null) call.resolve(output);
            notifyListeners("purchasesUpdated", output);
        } else if (call != null) call.reject(result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED ? "Achat annulé." : "Achat indisponible.", result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED ? "purchase_canceled" : "purchase_failed");
    }
    @Override protected void handleOnDestroy() { if (billing != null) billing.endConnection(); }
}
