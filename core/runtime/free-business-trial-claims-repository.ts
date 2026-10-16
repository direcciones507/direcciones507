import type {Sql} from 'postgres';
import {businessTrialDuplicateSignal,evaluateFreeTrialClaims,normalizeBusinessName,normalizeBusinessPhone,type BusinessIdentity} from './free-business-trial-identity';
import {freeBusinessTrialEndsAt} from './free-business-trial';

/** Integration helper, not yet invoked by request approval/publication.
 * Requires reviewed free-business-trial.sql migration.
 * The caller MUST serialize claims for each identity and commit with publication.
 */
export async function inspectBusinessTrialHistory(sql:Sql,candidate:BusinessIdentity){
 const name=normalizeBusinessName(candidate.name),phone=normalizeBusinessPhone(candidate.phone);
 if(!name||phone.length<7)throw Error('FREE_TRIAL_IDENTITY_INCOMPLETE');
 const rows=await sql.unsafe(`SELECT business_name_normalized AS name,business_phone_normalized AS phone,
 country_code AS "countryCode",location_latitude AS latitude,location_longitude AS longitude
 FROM ad507.free_business_trial_claims
 WHERE country_code=$1 AND (business_name_normalized=$2 OR business_phone_normalized=$3
 OR ($4::numeric IS NOT NULL AND $5::numeric IS NOT NULL
 AND location_latitude BETWEEN $4::numeric-0.0001 AND $4::numeric+0.0001
 AND location_longitude BETWEEN $5::numeric-0.0001 AND $5::numeric+0.0001))`,
 [candidate.countryCode,name,phone,candidate.latitude??null,candidate.longitude??null]);
 const prior:BusinessIdentity[]=rows.map((r:any)=>({name:r.name,phone:r.phone,countryCode:r.countryCode,latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude)}));
 return {decision:evaluateFreeTrialClaims(candidate,prior),signals:prior.map(v=>businessTrialDuplicateSignal(candidate,v))};
}
/** Requires a transaction held by caller. No claim is issued for legacy migrations. */
export async function insertBusinessTrialClaim(tx:Sql,addressId:string,identity:BusinessIdentity,activatedAt:Date){
 const end=freeBusinessTrialEndsAt(activatedAt);
 const name=normalizeBusinessName(identity.name),phone=normalizeBusinessPhone(identity.phone);
 if(!name||phone.length<7)throw Error('FREE_TRIAL_IDENTITY_INCOMPLETE');
 if(!Number.isFinite(activatedAt.getTime()))throw Error('INVALID_ACTIVATION_DATE');
 await tx.unsafe(`INSERT INTO ad507.free_business_trial_claims
 (address_id,country_code,business_name_normalized,business_phone_normalized,location_latitude,location_longitude,claimed_at,trial_ends_at)
 VALUES($1::uuid,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz)`,
 [addressId,identity.countryCode,name,phone,identity.latitude??null,identity.longitude??null,activatedAt.toISOString(),end.toISOString()]);
 const updated=await tx.unsafe(`UPDATE ad507.addresses SET free_trial_started_at=$2::timestamptz,free_trial_ends_at=$3::timestamptz
 WHERE id=$1::uuid AND source='USER_REQUEST' AND address_type='BUSINESS'
 AND free_trial_started_at IS NULL RETURNING id`,[addressId,activatedAt.toISOString(),end.toISOString()]);
 if(updated.length!==1)throw Error('FREE_TRIAL_ADDRESS_NOT_ELIGIBLE');
 return end;
}

/** A claim insertion must be called from an already-open transaction, after
 * acquiring the global free-business-trial-claims advisory transaction lock,
 * rechecking ALL claims inside that same transaction, and deciding eligibility.
 * Never call this after an irreversible external publication without recovery.
 */
export const FREE_BUSINESS_TRIAL_LOCK_KEY='free-business-trial-claims:v1';
