export type PlayOffer = {token:string;offerId:string|null;phases:{price:string;micros:number;period:string;cycles:number}[]};
export type PlayProduct = {productId:string;offers:PlayOffer[]};
/** Display/selection only: Google and the backend remain authoritative. */
export function choosePlayOffer(product:PlayProduct|undefined,trialUsed:boolean,plan:string):PlayOffer|undefined {
  const monthly=product?.offers.filter(o=>o.phases.at(-1)?.period==='P1M')??[];
  const trial=!trialUsed && plan==='free' ? monthly.find(o=>o.offerId==='trial-1-month' && o.phases[0]?.micros===0 && o.phases[0]?.period==='P1M' && o.phases[0]?.cycles===1) : undefined;
  return trial??monthly.find(o=>!o.offerId && o.phases.every(p=>p.micros>0));
}
