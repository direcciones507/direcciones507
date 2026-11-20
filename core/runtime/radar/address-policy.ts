export type CoreAddressEligibility = {
 addressType:string; status:string; country:string; publiclyVisible:boolean; current:boolean; ownershipConfirmed:boolean;
};
// Only server-resolved CORE facts are accepted. Missing visibility or validity denies the link.
export function eligibleAddress(a:Partial<CoreAddressEligibility>|null, country:string):boolean {
 return !!a && (a.addressType==="BUSINESS" || a.addressType==="PLACE") &&
 a.status==="ACTIVE" && a.country===country && a.publiclyVisible===true &&
 a.current===true && a.ownershipConfirmed===true;
}
