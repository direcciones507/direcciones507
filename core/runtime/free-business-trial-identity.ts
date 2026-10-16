/** Advisory trial reuse signals. These are NOT an authorization or a uniqueness guarantee.
 * Historical addresses remain read-only and require separate reconciliation.
 */
export type BusinessIdentity={name:string;phone:string;countryCode:string;latitude?:number|null;longitude?:number|null};
export function normalizeBusinessName(value:string):string {
 return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function normalizeBusinessPhone(value:string):string {
 return value.replace(/\D/g,'');
}
export type DuplicateSignal='SAME_NAME_AND_PHONE'|'SAME_NAME_AND_LOCATION'|'SAME_PHONE_AND_LOCATION'|'REVIEW_REQUIRED'|'NONE';
export function businessTrialDuplicateSignal(a:BusinessIdentity,b:BusinessIdentity):DuplicateSignal {
 if(a.countryCode!==b.countryCode)return 'NONE';
 const sameName=!!normalizeBusinessName(a.name)&&normalizeBusinessName(a.name)===normalizeBusinessName(b.name);
 const phoneA=normalizeBusinessPhone(a.phone),phoneB=normalizeBusinessPhone(b.phone);
 const samePhone=phoneA.length>=7&&phoneA===phoneB;
 const hasCoords=[a.latitude,a.longitude,b.latitude,b.longitude].every(v=>typeof v==='number'&&Number.isFinite(v));
 const sameLocation=hasCoords&&Math.abs(a.latitude!-b.latitude!)<=0.0001&&Math.abs(a.longitude!-b.longitude!)<=0.0001;
 if(sameName&&samePhone)return 'SAME_NAME_AND_PHONE';
 if(sameName&&sameLocation)return 'SAME_NAME_AND_LOCATION';
 if(samePhone&&sameLocation)return 'SAME_PHONE_AND_LOCATION';
 return sameName||samePhone||sameLocation?'REVIEW_REQUIRED':'NONE';
}

/** Require a human review for any signal; never auto-approve a second free trial. */
export function freeTrialReviewDecision(signals:readonly DuplicateSignal[]):'REVIEW_REQUIRED'|'NO_MATCH' {
 return signals.some(signal=>signal!=='NONE')?'REVIEW_REQUIRED':'NO_MATCH';
}

/** A new free trial is never granted if a past claim shares a strong identity.
 * Weak signals must be adjudicated by ADMIN before any new trial is issued.
 */
export function evaluateFreeTrialClaims(candidate:BusinessIdentity,prior:readonly BusinessIdentity[]):
 'ELIGIBLE'|'ALREADY_USED'|'ADMIN_REVIEW' {
 let needsReview=false;
 for(const claimed of prior){
  const signal=businessTrialDuplicateSignal(candidate,claimed);
  if(signal==='SAME_NAME_AND_PHONE'||signal==='SAME_NAME_AND_LOCATION'||signal==='SAME_PHONE_AND_LOCATION')return 'ALREADY_USED';
  if(signal==='REVIEW_REQUIRED')needsReview=true;
 }
 return needsReview?'ADMIN_REVIEW':'ELIGIBLE';
}
