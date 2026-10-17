/** Shared plan classification; no provider, price, allocation or publication side effects. */
export function isAutomaticPaidPlan(row:{address_type?:string;type?:string;request_data?:any;plan?:string}){
 const type=row.address_type??row.type,plan=row.request_data?.plan??row.plan;
 return !row.request_data?.migration&&(type==='RESIDENTIAL'&&plan==='RESIDENTIAL'||type==='BUSINESS'&&['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan));
}
export function automaticPaidStateAllowed(row:any){
 return isAutomaticPaidPlan(row)&&((row.status==='DRAFT'&&row.request_data?.workflow==='PAYMENT_PENDING')||(row.status==='PENDING_REVIEW'&&row.request_data?.workflow==='SECURITY_REVIEW'&&row.review_decision==='APPROVED'));
}
