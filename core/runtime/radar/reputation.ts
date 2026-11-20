import {readRadarJson} from "./request-body";
import {radarActor,type CoreAuth} from "./auth";
type DB={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"private, no-store"}});
// A conservative participation indicator, not a proof of accuracy or identity.
export function participationLevel(days:number,corroboratedDays:number){
 if(corroboratedDays>=10&&days>=15)return "constant";
 if(corroboratedDays>=3&&days>=5)return "active";
 return "initial";
}
export function createReputationRoutes(db:DB,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 return async(req:Request):Promise<Response|null>=>{
  if(!enabled||new URL(req.url).pathname!=="/v1/radar/reputation")return null;
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const actor=await radarActor(req,auth,origins);
  if(!actor)return json(403,{error:"AUTH_REQUIRED"});
  const parsed=await readRadarJson(req,512);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
  if(body?.action!=="summary")return json(400,{error:"INVALID_REPUTATION"});
  const rows=await db.unsafe(`WITH own_reports AS (
   SELECT r.id,r.establishment_id,r.created_at FROM radar.activity_reports r
   JOIN radar.establishments e ON e.id=r.establishment_id AND e.published
   WHERE r.account_ref=$1::uuid AND r.source='community' AND r.created_at>=now()-interval '90 days' AND r.created_at<=now()
  ), own_votes AS (
   SELECT c.created_at FROM radar.activity_confirmations c
   JOIN radar.activity_reports r ON r.id=c.report_id JOIN radar.establishments e ON e.id=r.establishment_id AND e.published
   WHERE c.account_ref=$1::uuid AND c.created_at>=now()-interval '90 days' AND c.created_at<=now()
  ), corroborated AS (
   SELECT r.id,r.created_at FROM own_reports r
   JOIN radar.activity_confirmations c ON c.report_id=r.id
   WHERE c.account_ref IS NOT NULL AND c.account_ref<>$1::uuid AND c.created_at>=r.created_at AND c.created_at<r.created_at+interval '30 minutes' AND c.created_at<=now()
   GROUP BY r.id,r.created_at
   HAVING count(DISTINCT c.account_ref) FILTER (WHERE c.agrees)>=2
   AND count(*) FILTER (WHERE NOT c.agrees)=0
  )
  SELECT (SELECT count(*)::int FROM own_reports) AS reports,
   (SELECT count(*)::int FROM own_votes) AS validations,
   (SELECT count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int FROM (SELECT created_at FROM own_reports UNION ALL SELECT created_at FROM own_votes) a) AS days,
   (SELECT count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int FROM corroborated) AS corroborated_days`,[actor.accountRef]);
  const r=rows[0]??{},reports=Number(r.reports??0),validations=Number(r.validations??0),days=Number(r.days??0),corroboratedDays=Number(r.corroborated_days??0);
  return json(200,{reports,validations,days,corroboratedDays,level:participationLevel(days,corroboratedDays),windowDays:90});
 };
}
