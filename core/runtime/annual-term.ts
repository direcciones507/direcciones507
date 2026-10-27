import {paymentAmount} from './payment-policy';
export const ANNUAL_POLICY='annual-calendar-v1';
/** Same policy seam as feat/plan-expiry-renewal-20261017; one calendar year, not a guessed day count. */
export function annualExpiry(start:Date):Date {
 if(!Number.isFinite(start.getTime()))throw Error('INVALID_PLAN_PERIOD');
 const end=new Date(start),day=end.getUTCDate();end.setUTCDate(1);end.setUTCFullYear(end.getUTCFullYear()+1);
 const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));return end;
}
export function annualContract(plan:string,acceptedAt:string){
 if(!['RESIDENTIAL','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan)||!Number.isFinite(Date.parse(acceptedAt)))throw Error('INVALID_ANNUAL_CONTRACT');
 return {policy:ANNUAL_POLICY,period:'P1Y',amountCents:paymentAmount(plan),currency:'USD',acceptedAt,automaticCharge:false};
}
export function startAnnualTerm(contract:any,orderId:string,at=new Date()){
 if(contract?.policy!==ANNUAL_POLICY||contract.period!=='P1Y'||!orderId)throw Error('INVALID_ANNUAL_CONTRACT');
 return {policy:ANNUAL_POLICY,period:'P1Y',orderId,startsAt:at.toISOString(),expiresAt:annualExpiry(at).toISOString(),automaticCharge:false};
}
/** Calculation only: no provider call or public renewal route. A new verified payment and consent are mandatory. */
export function voluntaryAnnualRenewal(term:any,order:{id:string;status:string;amountCents:number},plan:string,accepted:boolean,at=new Date()){
 if(accepted!==true||order.status!=='PAID'||order.amountCents!==paymentAmount(plan)||!order.id)throw Error('RENEWAL_CONFIRMATION_REQUIRED');
 if(term.orderId===order.id)return term;
 const start=Date.parse(term.expiresAt)>at.getTime()?new Date(term.expiresAt):at;
 return startAnnualTerm(annualContract(plan,at.toISOString()),order.id,start);
}
