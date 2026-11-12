/** Event images reuse the existing decoder/EXIF stripping and private R2 signer. */
import {createHash} from 'node:crypto';
import {optimizeRequestImage,MAX_IMAGE_BYTES} from './image-processing';
import {signedR2Request} from './r2-signing';
import type {R2Settings} from './r2-storage';
export function createTemporaryEventMedia(settings:R2Settings,http:typeof fetch=fetch){
 return {
  async upload(eventId:string,bytes:Uint8Array,mime:string){
   if(!/^[a-f0-9-]{36}$/.test(eventId)||bytes.length>MAX_IMAGE_BYTES)throw Error('INVALID_IMAGE');
   const image=await optimizeRequestImage(bytes,mime);
   const key=`temporary-events/${eventId}/${createHash('sha256').update(image.bytes).digest('hex')}.webp`;
   const signed=signedR2Request(settings,'PUT',key,image.bytes,image.mime);
   const result=await http(signed.url,{method:'PUT',headers:signed.headers,body:Buffer.from(image.bytes),redirect:'error',signal:AbortSignal.timeout(30000)});
   if(!result.ok)throw Error('R2_UPLOAD_FAILED');
   return {key,size:image.bytes.length};
  },
  async read(key:string){
   if(!/^temporary-events\/[a-f0-9-]{36}\/[a-f0-9]{64}\.webp$/.test(key))throw Error('INVALID_STORAGE_KEY');
   const signed=signedR2Request(settings,'GET',key,new Uint8Array(),'image/webp');
   const result=await http(signed.url,{headers:signed.headers,redirect:'error',signal:AbortSignal.timeout(30000)});
   if(!result.ok)throw Error('R2_READ_FAILED');
   const reader=result.body?.getReader();if(!reader)throw Error('INVALID_STORED_IMAGE');
   let length=0;const parts:Uint8Array[]=[];
   try{while(true){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>MAX_IMAGE_BYTES){await reader.cancel();throw Error('INVALID_STORED_IMAGE')}parts.push(next.value)}}finally{reader.releaseLock()}
   return Buffer.concat(parts);
  }
 };
}
