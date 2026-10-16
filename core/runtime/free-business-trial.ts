/** New USER_REQUEST business trials only. Historical addresses never enter this policy. */
export const FREE_BUSINESS_OFFER_END='2026-11-09';
export const FREE_BUSINESS_TRIAL_MONTHS=1;
export const FREE_BUSINESS_UPGRADE_DISCOUNT_PERCENT=25;
export type TrialState='ACTIVE'|'EXPIRED';
export function freeBusinessOfferEligible(activatedAt:Date):boolean {
 if(!Number.isFinite(activatedAt.getTime()))throw Error('INVALID_ACTIVATION_DATE');
 return activatedAt.getTime()<=Date.parse('2026-11-10T04:59:59.999Z'); // Nov 9 23:59:59.999 Panama (UTC-5)
}
export function freeBusinessTrialEndsAt(activatedAt:Date):Date {
 if(!freeBusinessOfferEligible(activatedAt))throw Error('FREE_BUSINESS_OFFER_CLOSED');
 const offset=5*60*60*1000; // Panama local time is UTC-5
 const local=new Date(activatedAt.getTime()-offset);
 const year=local.getUTCFullYear(),month=local.getUTCMonth()+FREE_BUSINESS_TRIAL_MONTHS,day=local.getUTCDate();
 const first=new Date(Date.UTC(year,month,1,local.getUTCHours(),local.getUTCMinutes(),local.getUTCSeconds(),local.getUTCMilliseconds()));
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 first.setUTCDate(Math.min(day,last));
 return new Date(first.getTime()+offset);
}
export function freeBusinessTrialState(endsAt:Date,now:Date):TrialState {
 if(!Number.isFinite(endsAt.getTime())||!Number.isFinite(now.getTime()))throw Error('INVALID_TRIAL_DATE');
 return now.getTime()>=endsAt.getTime()?'EXPIRED':'ACTIVE';
}
export function firstUpgradeAmountCents(plan:'BUSINESS_PREMIUM'|'BUSINESS_PREMIUM_PRO',baseAmountCents:number,eligible:boolean,alreadyRedeemed:boolean,trialEndsAt:Date,paymentConfirmedAt:Date):number {
 if(!Number.isFinite(trialEndsAt.getTime())||!Number.isFinite(paymentConfirmedAt.getTime()))throw Error('INVALID_PAYMENT_DATE');
 if(!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan)||!Number.isSafeInteger(baseAmountCents)||baseAmountCents<0)throw Error('INVALID_UPGRADE');
 return eligible&&!alreadyRedeemed&&paymentConfirmedAt.getTime()<trialEndsAt.getTime()?Math.round(baseAmountCents*0.75):baseAmountCents;
}
