import {readRadarJson} from "./request-body";
import {radarActor,type CoreAuth} from "./auth";
export interface ModerationStore {
 pending(limit:number):Promise<readonly {id:string;name:string;category:string;country:string;latitude:number;longitude:number}[]>;
 publish(id:string):Promise<boolean>;
 revokeOwner?(id:string,accountRef:string,adminRef:string):Promise<boolean>;
 verifyOwner?(id:string,accountRef:string,adminRef:string):Promise<boolean>;
}
export function createModerationRoutes(store:ModerationStore,auth:CoreAuth,origins:ReadonlySet<string>,enabled=false){
 const json=(status:number,data:unknown)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url);
  if(!enabled||url.pathname!=="/v1/radar/admin/moderation")return null;
  if(req.method!=="POST")return json(405,{error:"METHOD_NOT_ALLOWED"});
  const actor=await radarActor(req,auth,origins);
  if(!actor?.isAdmin)return json(403,{error:"FORBIDDEN"});
  const parsed=await readRadarJson(req,2048);if(!parsed.ok)return json(parsed.status,{error:parsed.error});
  const body=parsed.body as any;
  if(body?.action==="revoke_owner"){
   const uuid=(v:unknown)=>typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
   if(!uuid(body.id)||!uuid(body.accountRef))return json(400,{error:"INVALID_REVOCATION"});
   if(!store.revokeOwner)return json(503,{error:"VERIFICATION_DISABLED"});
   return await store.revokeOwner(body.id,body.accountRef,actor.accountRef)?json(200,{ok:true}):json(404,{error:"OWNERSHIP_NOT_FOUND"});
  }
  if(body?.action==="verify_owner"){
   const uuid=(v:unknown)=>typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
   if(!uuid(body.id)||!uuid(body.accountRef)||body.evidenceReviewed!==true)return json(400,{error:"INVALID_VERIFICATION"});
   if(!store.verifyOwner)return json(503,{error:"VERIFICATION_DISABLED"});
   return await store.verifyOwner(body.id,body.accountRef,actor.accountRef)?json(200,{ok:true}):json(409,{error:"OWNERSHIP_UNAVAILABLE"});
  }
  if(body?.action==="list")return json(200,{items:await store.pending(100)});
  if(body?.action!=="publish"||typeof body.id!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))return json(400,{error:"INVALID_ACTION"});
  return await store.publish(body.id)?json(200,{ok:true}):json(404,{error:"NOT_FOUND_OR_PUBLISHED"});
 };
}
