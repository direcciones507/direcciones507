/** Shared plan classification; no provider, price, allocation or publication side effects. */
export function isAutomaticPaidPlan(row:{address_type?:string;type?:string;request_data?:any;plan?:string}){
 const type=row.address_type??row.type,plan=row.request_data?.plan??row.plan;
 return !row.request_data?.migration&&(type==='RESIDENTIAL'&&plan==='RESIDENTIAL'||type==='BUSINESS'&&['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan));
}
export function automaticPaidStateAllowed(row:any){
 return isAutomaticPaidPlan(row)&&((row.status==='DRAFT'&&row.request_data?.workflow==='PAYMENT_PENDING')||(row.status==='PENDING_REVIEW'&&row.request_data?.workflow==='SECURITY_REVIEW'&&row.review_decision==='APPROVED'));
}

/** Checkout is only for unpaid, unreviewed client requests. Legacy requests
 * saved before PAYMENT_PENDING existed may still be resumable without copying
 * their address, photographs or ownership. */
export function isLegacyUnpaidPaidRequest(row:any):boolean{
 return isAutomaticPaidPlan(row)&&row.source==='USER_REQUEST'&&row.status==='PENDING_REVIEW'&&
   !row.review_decision&&!row.publication_receipt&&!row.code&&
   !row.request_data?.createdByAdmin&&!row.request_data?.workflow;
}
export function isPayableClientRequest(row:any):boolean{
 return isAutomaticPaidPlan(row)&&
  ((row.source==='USER_REQUEST'&&row.status==='DRAFT'&&row.request_data?.workflow==='PAYMENT_PENDING')||
   isLegacyUnpaidPaidRequest(row));
}
