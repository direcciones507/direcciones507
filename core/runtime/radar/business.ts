import {readRadarJson} from "./request-body";
import {radarActor,type CoreAuth} from './auth';
type Database={unsafe(query:string,params:any[]):PromiseLike<any[]>};
export const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
export function validateBusiness(input:any){
 if(!input||!input.hours||typeof input.hours!=='object'||Array.isArray(input.hours)||Object.keys(input.hours).some(k=>!days.includes(k as any)))return null;
 const hours:Record<string,string>={};
 for(const day of days){const value=input.hours[day]??'';if(typeof value!=='string'||(value!==''&&value!=='closed'&&!/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)))return null;if(value)hours[day]=value;}
 if(input.quantity!==null&&(!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>100000))return null;
 if(!['tables','rooms','places','units'].includes(input.unit))return null;
 return {hours,quantity:input.quantity,unit:input.unit};
}
export function createBusinessStore(db:Database,profilesEnabled=false){return {
 async mine(account:string){return await db.unsafe(`SELECT e.id,e.name,e.category,e.country,
 (o.account_ref=$1::uuid) IS TRUE AS authorized,(r.account_ref IS NOT NULL) AS requested,
 (e.account_ref::text=$1::text) AS submitted,${profilesEnabled?"(p.submitted_by=$1::uuid) IS TRUE":"false"} AS declared,
 access.allowed AS "canManage",${profilesEnabled?"CASE WHEN access.allowed THEN p.profile END":"NULL"} AS profile,
 d.quantity,d.unit,d.hours
 FROM radar.establishments e
 LEFT JOIN radar.verified_owners o ON o.establishment_id=e.id
 LEFT JOIN radar.ownership_requests r ON r.establishment_id=e.id AND r.account_ref=$1::uuid
 ${profilesEnabled?"LEFT JOIN radar.registration_profiles p ON p.establishment_id=e.id":""}
 CROSS JOIN LATERAL (SELECT ((o.account_ref=$1::uuid) IS TRUE
 ${profilesEnabled?"OR (o.account_ref IS NULL AND (p.submitted_by=$1::uuid) IS TRUE)":""}) AS allowed) access
 LEFT JOIN radar.business_details d ON d.establishment_id=e.id AND d.updated_by=$1::uuid AND access.allowed
 WHERE e.published AND (e.account_ref::text=$1::text OR access.allowed OR r.account_ref IS NOT NULL
 ${profilesEnabled?"OR p.submitted_by=$1::uuid":""})
 ORDER BY e.created_at DESC,e.id LIMIT 100`,[account]);},
 async inspect(id:string,account:string){const rows=await db.unsafe(`SELECT e.id,(o.account_ref=$2::uuid) AS authorized,d.hours,d.quantity,d.unit,
 EXISTS(SELECT 1 FROM radar.ownership_requests r WHERE r.establishment_id=e.id AND r.account_ref=$2::uuid) AS requested
 FROM radar.establishments e LEFT JOIN radar.verified_owners o ON o.establishment_id=e.id
 LEFT JOIN radar.business_details d ON d.establishment_id=e.id AND d.updated_by=o.account_ref
 WHERE e.id=$1::uuid AND e.published`,[id,account]);return rows[0]??null;},
 async claim(id:string,account:string,reason:string){const rows=await db.unsafe(`WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext('radar-claim:' || $2::text)))
 INSERT INTO radar.ownership_requests(establishment_id,account_ref,reason)
 SELECT e.id,$2::uuid,$3 FROM radar.establishments e,lock WHERE e.id=$1::uuid AND e.published
 AND (SELECT count(*) FROM radar.ownership_requests WHERE account_ref=$2::uuid)<20
 AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id AND o.account_ref=$2::uuid)
 ON CONFLICT DO NOTHING RETURNING establishment_id`,[id,account,reason]);return rows.length===1;},
 async update(id:string,account:string,data:NonNullable<ReturnType<typeof validateBusiness>>){const rows=await db.unsafe(`WITH owner AS MATERIALIZED (
 SELECT o.establishment_id,o.account_ref FROM radar.verified_owners o JOIN radar.establishments e ON e.id=o.establishment_id
 WHERE o.establishment_id=$1::uuid AND o.account_ref=$2::uuid AND e.published FOR UPDATE OF o)
 INSERT INTO radar.business_details(establishment_id,updated_by,hours,quantity,unit)
 SELECT establishment_id,account_ref,$3::text::jsonb,$4,$5 FROM owner
 ON CONFLICT(establishment_id) DO UPDATE SET updated_by=EXCLUDED.updated_by,hours=EXCLUDED.hours,quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,updated_at=now()
 RETURNING establishment_id`,[id,account,JSON.stringify(data.hours),data.quantity,data.unit]);return rows.length===1;},
 async requests(){return await db.unsafe(`SELECT r.establishment_id AS id,r.account_ref::text AS "accountRef",r.reason,e.name
 FROM radar.ownership_requests r JOIN radar.establishments e ON e.id=r.establishment_id
 WHERE e.published AND NOT EXISTS(SELECT 1 FROM radar.verified_owners o WHERE o.establishment_id=e.id)
 ORDER BY r.created_at LIMIT 100`,[]);}
};}
export function createBusinessRoutes(store:ReturnType<typeof createBusinessStore>,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){return async(req:Request):Promise<Response|null>=>{
 if(new URL(req.url).pathname!=='/v1/radar/business')return null;
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
 if(!enabled)return json(503,{error:'VERIFICATION_DISABLED'});
 if(req.method!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 const actor=await radarActor(req,auth,origins);if(!actor)return json(403,{error:'AUTH_REQUIRED'});
 const parsed=await readRadarJson(req,4096);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
 if(body?.action==='requests')return actor.isAdmin?json(200,{items:await store.requests()}):json(403,{error:'FORBIDDEN'});
 if(body?.action==='mine')return json(200,{items:await store.mine(actor.accountRef)});
 if(!body||typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))return json(400,{error:'INVALID_ACTION'});
 if(body.action==='inspect'){const item=await store.inspect(body.id,actor.accountRef);if(!item)return json(404,{error:'NOT_FOUND'});return json(200,{authorized:item.authorized===true,requested:item.requested===true,...(item.authorized?{hours:item.hours??{},quantity:item.quantity??null,unit:item.unit??'units'}:{})});}
 if(body.action==='claim'){
 const reason=typeof body.reason==='string'?body.reason.trim():'';
 if(reason.length<10||reason.length>500)return json(400,{error:'INVALID_CLAIM'});
 return await store.claim(body.id,actor.accountRef,reason)?json(201,{ok:true}):json(409,{error:'CLAIM_UNAVAILABLE'});
 }
 if(body.action==='update'){const data=validateBusiness(body);if(!data)return json(400,{error:'INVALID_BUSINESS'});return await store.update(body.id,actor.accountRef,data)?json(200,{ok:true}):json(403,{error:'OWNER_REQUIRED'});}
 return json(400,{error:'INVALID_ACTION'});
};}
