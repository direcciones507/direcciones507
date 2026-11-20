import {readRadarJson} from "./request-body";
import {radarActor,type CoreAuth} from "./auth";
type DB={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"private, no-store"}});
const kinds=new Set(["all","report","confirmation"]);
export function createContributionRoutes(db:DB,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 return async(req:Request):Promise<Response|null>=>{
  if(!enabled||new URL(req.url).pathname!=="/v1/radar/contributions")return null;
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const actor=await radarActor(req,auth,origins);
  if(!actor)return json(403,{error:"AUTH_REQUIRED"});
  const parsed=await readRadarJson(req,1024);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
  if(!body||body.action!=="list")return json(400,{error:"INVALID_CONTRIBUTIONS"});
  const kind=body.kind??"all",offset=body.offset??0;
  if(!kinds.has(kind)||!Number.isSafeInteger(offset)||offset<0||offset>2000)return json(400,{error:"INVALID_CONTRIBUTIONS"});
  const rows=await db.unsafe(`WITH own_activity AS (
    SELECT r.id,'report'::text AS kind,r.establishment_id,r.state,r.source,NULL::boolean AS agrees,r.created_at,r.created_at AS report_at
    FROM radar.activity_reports r WHERE r.account_ref=$1::uuid AND ($2::text IN ('all','report'))
    UNION ALL
    SELECT c.id,'confirmation'::text,r.establishment_id,r.state,r.source,c.agrees,c.created_at,r.created_at
    FROM radar.activity_confirmations c JOIN radar.activity_reports r ON r.id=c.report_id
    WHERE c.account_ref=$1::uuid AND ($2::text IN ('all','confirmation'))
   )
   SELECT a.id,a.kind,a.state,a.source,a.agrees,extract(epoch from a.created_at)*1000 AS created_at,
   a.report_at>now()-interval '30 minutes' AND a.report_at<=now() AND e.published AS current,
   CASE WHEN e.published THEN e.name END AS name,CASE WHEN e.published THEN e.country END AS country,
   CASE WHEN e.published THEN e.category END AS category
   FROM own_activity a JOIN radar.establishments e ON e.id=a.establishment_id
   ORDER BY a.created_at DESC,a.kind,a.id LIMIT 26 OFFSET $3`,[actor.accountRef,kind,offset]);
  return json(200,{items:rows.slice(0,25).map(r=>({id:r.id,kind:r.kind,state:r.state,source:r.source,agrees:r.kind==="confirmation"?r.agrees===true:null,createdAt:Number(r.created_at),current:r.current===true,name:r.name??null,country:r.country??null,category:r.category??null})),nextOffset:rows.length>25&&offset<2000?offset+25:null});
 };
}
