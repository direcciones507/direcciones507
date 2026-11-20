import {readRadarJson} from "./request-body";
import {radarActor,type CoreAuth} from "./auth";
type DB={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const states=new Set(["available","queue","full","incident"]);
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"private, no-store"}});
export function createAlertRoutes(db:DB,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 return async(req:Request):Promise<Response|null>=>{
  if(!enabled||new URL(req.url).pathname!=="/v1/radar/alerts")return null;
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const actor=await radarActor(req,auth,origins);if(!actor)return json(403,{error:"AUTH_REQUIRED"});
  const parsed=await readRadarJson(req,1024);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
  if(body?.action==="list"){
   const rows=await db.unsafe(`SELECT e.id,e.name,e.country,p.activity,
    r.state,r.source,extract(epoch from r.created_at)*1000 AS reported_at
    FROM radar.alert_preferences p JOIN radar.establishments e ON e.id=p.establishment_id AND e.published
    LEFT JOIN LATERAL (SELECT a.id,a.state,a.source,a.created_at FROM radar.activity_reports a
     WHERE a.establishment_id=e.id AND a.created_at>now()-interval '30 minutes' AND a.created_at<=now()
     ORDER BY a.created_at DESC,(a.source='verified_owner') DESC,a.id LIMIT 1) r ON true
    WHERE p.account_ref=$1::uuid ORDER BY e.name,e.id,p.activity LIMIT 400`,[actor.accountRef]);
   return json(200,{preferences:rows.map(r=>({id:r.id,name:r.name,country:r.country,activity:r.activity,match:r.state===r.activity&&r.reported_at!=null?{state:r.state,source:r.source,reportedAt:Number(r.reported_at)}:null}))});
  }
  if(!body||!["enable","disable"].includes(body.action)||typeof body.id!=="string"||!uuid.test(body.id)||!states.has(body.activity))return json(400,{error:"INVALID_ALERT"});
  if(body.action==="disable"){
   await db.unsafe("DELETE FROM radar.alert_preferences WHERE account_ref=$1::uuid AND establishment_id=$2::uuid AND activity=$3",[actor.accountRef,body.id,body.activity]);return json(200,{enabled:false});
  }
  try{
   const rows=await db.unsafe(`INSERT INTO radar.alert_preferences(account_ref,establishment_id,activity)
   SELECT f.account_ref,f.establishment_id,$3 FROM radar.favorites f JOIN radar.establishments e ON e.id=f.establishment_id AND e.published
   WHERE f.account_ref=$1::uuid AND f.establishment_id=$2::uuid
   ON CONFLICT(account_ref,establishment_id,activity) DO NOTHING RETURNING establishment_id`,[actor.accountRef,body.id,body.activity]);
   if(!rows.length){const existing=await db.unsafe("SELECT p.establishment_id FROM radar.alert_preferences p JOIN radar.establishments e ON e.id=p.establishment_id AND e.published WHERE p.account_ref=$1::uuid AND p.establishment_id=$2::uuid AND p.activity=$3",[actor.accountRef,body.id,body.activity]);if(!existing.length)return json(404,{error:"FAVORITE_REQUIRED"});}
   return json(200,{enabled:true});
  }catch(error){if((error as {code?:string})?.code==="23503")return json(404,{error:"FAVORITE_REQUIRED"});throw error;}
 };
}
