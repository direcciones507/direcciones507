import {verifiedRadarOrdersEnabled} from './verified-orders';
import type { Sql } from 'postgres';
import { MAX_IMAGE_BYTES } from '../image-processing';
import { r2Settings } from '../r2-storage';
import type { CoreAuth } from './auth';
import { createRadarCoverRepository } from './cover-repository';
import { createRadarCoverStorage } from './cover-storage';

const ownerPath='/v1/user/radar/business/cover';
const publicPath='/v1/radar/business/cover';
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff'};

export function createRadarCoverRoutes(db:Sql,auth:CoreAuth,env:Record<string,string|undefined>,ownerOrigin?:string,http:typeof fetch=fetch) {
 const json=(status:number,error:string)=>Response.json({error},{status,headers});
 return async(req:Request):Promise<Response|null>=>{
  const url=new URL(req.url);
  if(url.pathname!==(ownerOrigin?ownerPath:publicPath))return null;
  if(env.RADAR_COMMERCIAL_MODEL_ENABLED!=='true')return json(404,'NOT_FOUND');
  const id=url.searchParams.get('id')??'';
  if(!uuid.test(id))return json(404,'NOT_FOUND');
  const settings=r2Settings(env);
  if(!settings)return json(404,'NOT_FOUND');
  const repository=createRadarCoverRepository(db,verifiedRadarOrdersEnabled(env));
  try{
   const storage=createRadarCoverStorage(settings,repository,http);
   if(!ownerOrigin){
    if(req.method!=='GET')return json(405,'METHOD_NOT_ALLOWED');
    return await storage.read(id)??json(404,'NOT_FOUND');
   }
   if(req.method!=='POST'&&req.method!=='DELETE'&&req.method!=='PATCH')return json(405,'METHOD_NOT_ALLOWED');
   if(req.headers.get('origin')!==ownerOrigin)return json(403,'FORBIDDEN');
   const user=await auth.currentUser(req);
   if(!user||!uuid.test(user.id))return json(403,'FORBIDDEN');
   if(req.method==='POST'){
    if(!await repository.canUpload(user.id,id))return json(403,'FORBIDDEN');
    const mime=req.headers.get('content-type')??'';
    if(!['image/jpeg','image/png','image/webp'].includes(mime)||!req.body)return json(400,'INVALID_IMAGE');
    if(Number(req.headers.get('content-length'))>MAX_IMAGE_BYTES)return json(413,'BODY_TOO_LARGE');
    const reader=req.body.getReader();
    const chunks:Uint8Array[]=[];
    let length=0;
    try{
     for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.length;
      if(length>MAX_IMAGE_BYTES){
       void reader.cancel().catch(()=>{});
       return json(413,'BODY_TOO_LARGE');
      }
      chunks.push(value);
     }
    }finally{reader.releaseLock();}
    await storage.upload(user.id,id,Buffer.concat(chunks,length),mime);
   }else if(!(req.method==='DELETE'?await repository.remove(user.id,id):await repository.canManage(user.id,id))){
    return json(403,'FORBIDDEN');
   }
   // References stay queued in PostgreSQL across failures and process restarts.
   const pending=await repository.pending(id);
   const results=await Promise.allSettled(pending.map(row=>storage.cleanup(id,row.storage_key)));
   return Response.json({ok:true,cleanupPending:pending.length===10||results.some(result=>result.status==='rejected')},{headers});
  }catch(error){
   if(!ownerOrigin)return json(404,'NOT_FOUND');
   const message=(error as Error)?.message;
   if(message==='INVALID_IMAGE')return json(400,message);
   if(message==='RADAR_COVER_FORBIDDEN')return json(403,message);
   return json(503,'RADAR_COVER_UNAVAILABLE');
  }
 };
}
