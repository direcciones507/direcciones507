/** New USER_REQUEST business trials only. Historical addresses never enter this policy. */
export const FREE_BUSINESS_OFFER_END='2026-11-09';
export const FREE_BUSINESS_TRIAL_MONTHS=2;
export const FREE_BUSINESS_UPGRADE_DISCOUNT_PERCENT=25;
export type TrialState='ACTIVE'|'EXPIRED';
export function freeBusinessOfferEligible(activatedAt:Date):boolean {
 if(!Number.isFinite(activatedAt.getTime()))throw Error('INVALID_ACTIVATION_DATE');
 return activatedAt.getTime()<=Date.parse('2026-11-10T04:59:59.999Z'); // Nov 9 23:59:59.999 Panama (UTC-5)
}
export function freeBusinessTrialEndsAt(activatedAt:Date):Date {
 if(!freeBusinessOfferEligible(activatedAt))throw Error('FREE_BUSINESS_OFFER_CLOSED');
 const year=activatedAt.getUTCFullYear(),month=activatedAt.getUTCMonth()+FREE_BUSINESS_TRIAL_MONTHS,day=activatedAt.getUTCDate();
 const first=new Date(Date.UTC(year,month,1,activatedAt.getUTCHours(),activatedAt.getUTCMinutes(),activatedAt.getUTCSeconds(),activatedAt.getUTCMilliseconds()));
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 first.setUTCDate(Math.min(day,last));
 return first;
}
export function freeBusinessTrialState(endsAt:Date,now:Date):TrialState {
 if(!Number.isFinite(endsAt.getTime())||!Number.isFinite(now.getTime()))throw Error('INVALID_TRIAL_DATE');
 return now.getTime()>=endsAt.getTime()?'EXPIRED':'ACTIVE';
}
export function firstUpgradeAmountCents(plan:'BUSINESS_PREMIUM'|'BUSINESS_PREMIUM_PRO',baseAmountCents:number,eligible:boolean,alreadyRedeemed:boolean):number {
 if(!['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan)||!Number.isSafeInteger(baseAmountCents)||baseAmountCents<0)throw Error('INVALID_UPGRADE');
 return eligible&&!alreadyRedeemed?Math.round(baseAmountCents*0.75):baseAmountCents;
}
