export const PLAN_POLICY_VERSION='plan-lifecycle-v1';
export const DAY_MS=86400000;
export type PlanPeriods=Record<string,number>;
export function configuredPlanPeriods(raw:string|undefined):PlanPeriods {
 if(!raw)return {};
 const data=JSON.parse(raw);
 if(!data||Array.isArray(data)||typeof data!=='object')throw Error('INVALID_PLAN_PERIODS');
 for(const [key,value]of Object.entries(data))if(!/^(PA|CO|CR|GT|SV|HN|NI|MX):BUSINESS_PREMIUM(_PRO)?$/.test(key)||!Number.isInteger(value)||Number(value)<1||Number(value)>3660)throw Error('INVALID_PLAN_PERIODS');
 return Object.freeze(data);
}
export function expiryFor(start:Date,days:number):Date {
 if(!Number.isInteger(days)||days<1||days>3660||!Number.isFinite(start.getTime()))throw Error('INVALID_PLAN_PERIOD');
 return new Date(start.getTime()+days*DAY_MS);
}
export function paidBenefitsActive(extras:any,now=Date.now()):boolean {
 const term=extras?.planLifecycle;
 if(!term)return true; // No retroactive migration of existing or historical records.
 if(term.revoked)return false;
 return !term.expiresAt||Date.parse(term.expiresAt)>now;
}
export function reminderKind(expiresAt:Date,now:Date):'D15'|'D7'|'D1'|'EXPIRED'|null {
 const days=Math.ceil((expiresAt.getTime()-now.getTime())/DAY_MS);
 if(days<=0)return 'EXPIRED';
 if(days<=1)return 'D1';if(days<=7)return 'D7';if(days<=15)return 'D15';return null;
}
export const COUNTRY_TIMEZONES:Record<string,string>={PA:'America/Panama',CO:'America/Bogota',CR:'America/Costa_Rica',GT:'America/Guatemala',SV:'America/El_Salvador',HN:'America/Tegucigalpa',NI:'America/Managua',MX:'America/Mexico_City'};

/** Uses only pre-existing columns; safe before the optional schema is installed. */
export async function addressPaidBenefitsActive(sql:any,id:string):Promise<boolean> {
 const [row]=await sql.unsafe("SELECT to_jsonb(a)->'request_data' AS extras,NOT EXISTS(SELECT 1 FROM ad507.orders o WHERE o.id::text=to_jsonb(a)->'request_data'->'planLifecycle'->>'orderId' AND o.status<>'PAID') AS payment_valid FROM ad507.addresses a WHERE a.id=$1::uuid",[id]);
 return !!row&&(row.extras?.migration||paidBenefitsActive(row.extras)&&row.payment_valid!==false);
}
