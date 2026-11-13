import {paymentAmount} from './payment-policy';
export type PurchaseMode='ANNUAL'|'INSTALLMENTS'|'SECOND_INSTALLMENT'|'RENEWAL'|'PLACE_AD_30'|'PLACE_AD_365';
export function commercialQuote(plan:string,mode:string){
 if(['PLACE_AD_30','PLACE_AD_365'].includes(mode)){
  if(plan!=='PLACE')throw Error('INVALID_PAYMENT_PLAN');const annual=mode==='PLACE_AD_365';return {mode,plan,amountCents:annual?16189:1499,totalCents:annual?16189:1499,durationDays:annual?365:30,installments:1,currency:'USD'};
 }
 if(!['RESIDENTIAL','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan))throw Error('INVALID_PAYMENT_PLAN');
 if(['INSTALLMENTS','SECOND_INSTALLMENT'].includes(mode)){
  if(plan==='RESIDENTIAL')throw Error('INVALID_PAYMENT_MODE');const amountCents=plan==='BUSINESS_PREMIUM'?1650:2750;
  return {mode,plan,amountCents,totalCents:amountCents*2,durationMonths:12,installments:2,currency:'USD'};
 }
 if(!['ANNUAL','RENEWAL'].includes(mode))throw Error('INVALID_PAYMENT_MODE');
 return {mode,plan,amountCents:paymentAmount(plan),totalCents:paymentAmount(plan),durationMonths:12,installments:1,currency:'USD'};
}
