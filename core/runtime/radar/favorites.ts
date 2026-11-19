import {radarActor,type CoreAuth} from "./auth";
type DB={unsafe(query:string,params:any[]):PromiseLike<any[]>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"private, no-store"}});
export function createFavoriteRoutes(db:DB,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 return async(req:Request):Promise<Response|null>=>{
  if(!enabled||new URL(req.url).pathname!=="/v1/radar/favorites")return null;
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const actor=await radarActor(req,auth,origins);
  if(!actor)return json(403,{error:"AUTH_REQUIRED"});
  let body:any;
  try{const raw=await req.text();if(raw.length>1024)return json(413,{error:"BODY_TOO_LARGE"});body=JSON.parse(raw);}catch{return json(400,{error:"INVALID_BODY"});}
  if(body?.action==="list"){
   const rows=await db.unsafe(`SELECT f.establishment_id AS id,e.published AS available,
   CASE WHEN e.published THEN e.name END AS name,CASE WHEN e.published THEN e.category END AS category,
   CASE WHEN e.published THEN e.country END AS country,
   CASE WHEN e.published THEN e.latitude END AS latitude,CASE WHEN e.published THEN e.longitude END AS longitude
   FROM radar.favorites f JOIN radar.establishments e ON e.id=f.establishment_id
   WHERE f.account_ref=$1::uuid ORDER BY f.created_at DESC,f.establishment_id LIMIT 100`,[actor.accountRef]);
   return json(200,{favorites:rows.map(r=>({id:r.id,available:r.available===true,name:r.available===true?r.name:null,category:r.available===true?r.category:null,country:r.available===true?r.country:null,coordinates:r.available===true?[Number(r.longitude),Number(r.latitude)]:null}))});
  }
  if(!body||!["add","remove"].includes(body.action)||typeof body.id!=="string"||!uuid.test(body.id))return json(400,{error:"INVALID_FAVORITE"});
  try{
   if(body.action==="remove"){await db.unsafe("DELETE FROM radar.favorites WHERE account_ref=$1::uuid AND establishment_id=$2::uuid",[actor.accountRef,body.id]);return json(200,{saved:false});}
   await db.unsafe("INSERT INTO radar.favorites(account_ref,establishment_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[actor.accountRef,body.id]);
   return json(200,{saved:true});
  }catch(error){
   const code=(error as {code?:string})?.code;
   if(code==="P4040"||code==="23503")return json(404,{error:"ESTABLISHMENT_UNAVAILABLE"});
   if(code==="P4290")return json(429,{error:"FAVORITE_LIMIT"});
   throw error;
  }
 };
}
