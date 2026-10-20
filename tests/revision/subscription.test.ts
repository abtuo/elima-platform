import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {choosePlayOffer,type PlayProduct} from '../../apps/revision/src/services/playOffers.ts';
const source=(file:string)=>readFile(new URL(`../../${file}`,import.meta.url),'utf8');
test('Play offers: trial once across products, no trial on replacement, authoritative prices',()=>{
  for(const id of ['elima_revision_standard','elima_revision_premium']) {
    const paid={price:'Prix Google localisé',micros:123456789,period:'P1M',cycles:0};
    const product:PlayProduct={productId:id,offers:[{token:'base',offerId:null,phases:[paid]},{token:'trial',offerId:'trial-1-month',phases:[{price:'Gratuit',micros:0,period:'P1M',cycles:1},paid]}]};
    assert.equal(choosePlayOffer(product,false,'free')?.token,'trial');
    assert.equal(choosePlayOffer(product,true,'free')?.token,'base');
    assert.equal(choosePlayOffer(product,false,'standard')?.token,'base');
    assert.equal(choosePlayOffer(product,false,'premium')?.token,'base');
    assert.equal(choosePlayOffer(product,true,'free')?.phases[0].price,paid.price);
    assert.equal(choosePlayOffer({productId:id,offers:[product.offers[1]]},true,'free'),undefined);
  }
  assert.equal(choosePlayOffer(undefined,false,'free'),undefined);
});
test('Web billing never simulates payment; native verifies/restores server-side and secrets stay server-side',async()=>{
  const service=await source('apps/revision/src/services/subscriptionService.ts');
  assert.match(service,/Capacitor\.isNativePlatform\(\)/);
  assert.match(service,/action:'restore'/);
  const page=await source('apps/revision/src/features/subscription/SubscriptionPage.tsx');
  assert.match(page,/action: "verify"/);
  assert.match(page,/billingAvailable/);
  assert.match(page,/disabled=\{!canBuy\}/);
  assert.doesNotMatch(service+page,/GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|GOOGLE_PLAY_ACCOUNT_HASH_SECRET|private_key|1500|3000/);
  const quiz=await source('apps/revision/src/features/revision/QuizPage.tsx');
  assert.match(quiz,/getDailyHintUsage\(profile.id\)\.catch/);
  const plugin=await source('apps/revision/android/app/src/main/java/ci/elima/revision/RevisionBillingPlugin.java');
  assert.match(plugin,/setObfuscatedAccountId/);
  assert.match(plugin,/p\.put\("price", phase\.getFormattedPrice\(\)\)/);
  assert.match(page,/paidPhase\.price/);
  assert.doesNotMatch(page,/1500|3000|1\s500|3\s000|Intl\.NumberFormat/);
  assert.match(plugin,/setOldPurchaseToken/);
  assert.match(plugin,/WITH_TIME_PRORATION/);
  assert.match(plugin,/DEFERRED/);
  assert.doesNotMatch(plugin,/acknowledgePurchase\(/);
});

test('subscription screen exposes honest limits and resilient loading/error states',async()=>{
  const page=await source('apps/revision/src/features/subscription/SubscriptionPage.tsx');
  assert.match(page,/500 quiz IA par jour/);
  assert.match(page,/200 fiches et 100 scans par jour/);
  assert.doesNotMatch(page,/Illimit[ée]/i);
  assert.doesNotMatch(page,/UTC|anti-abus/i);
  assert.match(page,/rightsLoading/);
  assert.match(page,/catalogLoading/);
  assert.match(page,/Recharger les tarifs/);
  assert.match(page,/sm:flex-row sm:flex-wrap/);
  assert.match(page,/trial &&/);
  assert.match(page,/managesPlaySubscription/);
});

test('paid offers preserve Google formatted amount and currency without local conversion',()=>{
  for(const price of ['1\u202f500 F\u202fCFA','€2.49','$3.99']) {
    for(const plan of ['standard','premium']) {
      const product:PlayProduct={productId:`elima_revision_${plan}`,offers:[{token:'base',offerId:null,phases:[{price,micros:2490000,period:'P1M',cycles:0}]}]};
      assert.equal(choosePlayOffer(product,true,'free')?.phases.at(-1)?.price,price);
    }
  }
});
