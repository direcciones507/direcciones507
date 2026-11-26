import {randomUUID} from 'node:crypto';
import {MAX_IMAGE_BYTES,optimizeRequestImage} from '../image-processing';
import {signedR2Request} from '../r2-signing';
import type {R2Settings} from '../r2-storage';

type CoverAccess = {
 canUpload(account:string,establishment:string):Promise<boolean>;
 stage(account:string,establishment:string,key:string):Promise<void>;
 publish(account:string,establishment:string,key:string):Promise<void>;
 visible(establishment:string):Promise<string|null>;
 // Must atomically claim an unreferenced key and prevent subsequent publication.
 claimCleanup(establishment:string,key:string):Promise<boolean>;
 finishCleanup(key:string):Promise<void>;
};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const keyFor=(id:string,key:string)=>uuid.test(id)&&key.startsWith('radar/covers/'+id+'/')&&uuid.test(key.slice(('radar/covers/'+id+'/').length,-5))&&key.endsWith('.webp');

export function createRadarCoverStorage(settings:R2Settings,access:CoverAccess,http:typeof fetch=fetch){
 if(settings.configurationVerified!==true||! /^[a-f0-9]{32}$/.test(settings.accountId)||settings.bucket!=='direcciones507-media')throw Error('R2_CONFIGURATION_NOT_VERIFIED');
 const send=(method:'GET'|'PUT'|'DELETE',key:string,bytes=new Uint8Array())=>{
  const signed=signedR2Request(settings,method,key,bytes,'image/webp');
  return http(signed.url,{method,headers:signed.headers,...(method==='PUT'?{body:Buffer.from(bytes)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
 };
 return {
  async upload(account:string,establishment:string,bytes:Uint8Array,mime:string){
   if(!uuid.test(account)||!uuid.test(establishment)||!await access.canUpload(account,establishment))throw Error('RADAR_COVER_FORBIDDEN');
   const image=await optimizeRequestImage(bytes,mime);
   const key='radar/covers/'+establishment+'/'+randomUUID()+'.webp';
   await access.stage(account,establishment,key);
   const result=await send('PUT',key,image.bytes);
   if(!result.ok)throw Error('R2_UPLOAD_FAILED');
   await access.publish(account,establishment,key);
  },
  async read(establishment:string){
   if(!uuid.test(establishment))return null;
   const key=await access.visible(establishment);
   if(!key||!keyFor(establishment,key))return null;
   const result=await send('GET',key);
   if(!result.ok)return null;
   if(!result.body||result.headers.get('content-type')?.split(';')[0]!=='image/webp'||Number(result.headers.get('content-length'))>MAX_IMAGE_BYTES){
    await result.body?.cancel();
    return null;
   }
   const reader=result.body.getReader();
   const chunks:Uint8Array[]=[];
   let length=0;
   try{
    for(;;){
     const part=await reader.read();
     if(part.done)break;
     length+=part.value.length;
     if(length>MAX_IMAGE_BYTES){await reader.cancel();return null;}
     chunks.push(part.value);
    }
   }finally{reader.releaseLock();}
   if(length<12||await access.visible(establishment)!==key)return null;
   return new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'content-type':'image/webp','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  },
  async cleanup(establishment:string,key:string){
   if(!keyFor(establishment,key)||!await access.claimCleanup(establishment,key))return false;
   const result=await send('DELETE',key);
   if(!result.ok&&result.status!==404)throw Error('R2_DELETE_FAILED');
   await access.finishCleanup(key);
   return true;
  }
 };
}
