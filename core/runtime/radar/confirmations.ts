import type {CoreAuth} from "./auth";
import {radarActor} from "./auth";
type DB={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
export function createConfirmationRoutes(db:DB,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false,anonymousIdentity?:(req:Request)=>string|null){
 return async(req:Request):Promise<Response|null>=>{
  const u=new URL(req.url);
  if(!enabled||u.pathname!=="/v1/radar/activity-validation")return null;
  if(req.method==="GET"){
   const id=u.searchParams.get("id");
   if(!id||!uuid.test(id))return json(400,{error:"INVALID_ESTABLISHMENT"});
   const rows=await db.unsafe(`SELECT r.id,r.state,r.source,extract(epoch from r.created_at)*1000 AS reported_at,
    (SELECT count(*)::int FROM radar.activity_confirmations c WHERE c.report_id=r.id AND c.agrees) AS confirmations,
    (SELECT count(*)::int FROM radar.activity_confirmations c WHERE c.report_id=r.id AND NOT c.agrees) AS contradictions
    FROM radar.activity_reports r JOIN radar.establishments e ON e.id=r.establishment_id
    WHERE e.id=$1::uuid AND e.published AND r.created_at>now()-interval '30 minutes' AND r.created_at<=now()
    ORDER BY r.created_at DESC,(r.source='verified_owner') DESC,r.id LIMIT 1`,[id]);
   const r=rows[0];
   return json(200,{report:r?{id:r.id,state:r.state,source:r.source,reportedAt:Number(r.reported_at),confirmations:Number(r.confirmations),contradictions:Number(r.contradictions)}:null});
  }
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const origin=req.headers.get("origin");
  if(!origin||!origins.has(origin))return json(403,{error:"AUTH_REQUIRED"});
  const actor=await radarActor(req,auth,origins),digest=actor?null:anonymousIdentity?.(req);
  if(!actor&&(!digest||!/^[0-9a-f]{64}$/.test(digest)))return json(403,{error:"AUTH_REQUIRED"});
  let body:any;
  try{const raw=await req.text();if(raw.length>1024)return json(413,{error:"BODY_TOO_LARGE"});body=JSON.parse(raw);}catch{return json(400,{error:"INVALID_BODY"});}
  if(!body||typeof body.reportId!=="string"||!uuid.test(body.reportId)||typeof body.agrees!=="boolean")return json(400,{error:"INVALID_CONFIRMATION"});
  try{
   await db.unsafe("INSERT INTO radar.activity_confirmations(report_id,account_ref,anonymous_ref,agrees) VALUES($1,$2,$3,$4)",[body.reportId,actor?.accountRef??null,digest??null,body.agrees]);
   return json(201,{ok:true});
  }catch(error){
   const code=(error as {code?:string})?.code;
   if(code==="P4290")return json(429,{error:"CONFIRMATION_RATE_LIMIT"});
   if(code==="P4090"||code==="23505")return json(409,{error:"ALREADY_VALIDATED_OR_OWN_REPORT"});
   if(code==="P4040"||code==="23503")return json(404,{error:"REPORT_UNAVAILABLE"});
   throw error;
  }
 };
}
