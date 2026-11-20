import {serviceExpired} from "../annual-service";
import {eligibleAddress} from "./address-policy";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
type Publication={type:string;url:string;extras?:{countryCode?:string;historical?:boolean}};
type ResolvePublication=(code:string)=>Promise<Publication|null>;
export function createRadarAddressResolver(db:Database,resolvePublication:ResolvePublication){
 return async (establishmentId:string,country:string)=>{
  const rows=await db.unsafe(`SELECT a.code,a.address_type,a.status,a.country_code,a.request_data
   FROM radar.establishments e JOIN ad507.addresses a ON a.id=e.digital_address_ref
   JOIN radar.verified_owners o ON o.establishment_id=e.id
   JOIN ad507.address_ownership own ON own.address_id=a.id AND own.user_id=o.account_ref AND own.ownership_role='OWNER'
   WHERE e.id=$1::uuid AND e.published AND e.country=$2 AND a.country_code=$2
   AND a.address_type IN ('BUSINESS','PLACE') AND a.status='ACTIVE'`,[establishmentId,country]);
  if(rows.length!==1)return null;
  const a=rows[0];
  if(serviceExpired(a.request_data)||a.request_data?.annualService?.paymentHold===true)return null;
  const publication=await resolvePublication(a.code);
  if(!publication || publication.type!==a.address_type || publication.extras?.historical!==false)return null;
  if(!eligibleAddress({addressType:a.address_type,status:a.status,country:publication.extras.countryCode,publiclyVisible:true,current:true,ownershipConfirmed:true},country))return null;
  return {publicUrl:publication.url,publiclyVisible:true,residential:false,active:true};
 };
}
