import {normalizeAd507Code} from "../../postgres/public-address-repository";
import {annualServiceDisconnected} from "../annual-service";
import {assertCountryPublication} from "../country-configuration";
import {addressPublicUrl} from "../custom-public-code";
import type {Establishment} from "./public-map";
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};

export function createRadarAddressResolver(db:Database){
 return async (establishmentIds:string[],country:string)=>{
  const links=new Map<string,NonNullable<Establishment["digitalAddress"]>>();
  if(!establishmentIds.length)return links;
  const rows=await db.unsafe(`SELECT e.id::text AS establishment_id,a.code,a.address_type,a.source,a.country_code,a.request_data
   FROM radar.establishments e JOIN ad507.addresses a ON a.id=e.digital_address_ref
   WHERE e.id=ANY(string_to_array($1::text, ',')::uuid[]) AND e.published AND e.country=$2
   AND a.country_code=$2 AND a.address_type IN ('BUSINESS','PLACE') AND a.status='ACTIVE'
   AND a.source='USER_REQUEST' AND a.publication_receipt IS NOT NULL
   AND EXISTS (
    SELECT 1 FROM radar.verified_owners o JOIN ad507.address_ownership own
      ON own.address_id=a.id AND own.user_id=o.account_ref AND own.ownership_role='OWNER'
    WHERE o.establishment_id=e.id
   )`,[[...new Set(establishmentIds)].join(','),country]);
  for(const row of rows){
   const data=row.request_data;
   if(data?.migration||(data?.countryCode??'PA')!==country||!normalizeAd507Code(row.code)||
      annualServiceDisconnected(data)||data?.annualService?.paymentHold===true)continue;
   try{assertCountryPublication(country,row.address_type,data?.plan);}
   catch{continue;}
   links.set(row.establishment_id,{publicUrl:addressPublicUrl(row),publiclyVisible:true,residential:false,active:true});
  }
  return links;
 };
}
