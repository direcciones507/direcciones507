import {test,expect} from 'bun:test';
import {createRadarCoverStorage} from '../radar/cover-storage';

test('Radar cover access refuses foreign objects and expired references before calling R2',async()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const key='radar/covers/'+id+'/00000000-0000-4000-8000-000000000002.webp';
 const settings={configurationVerified:true as const,bucket:'direcciones507-media',accountId:'a'.repeat(32),accessKeyId:'fake',secretAccessKey:'fake'};
 let visible:string|null=null,cleanup=false,finished=false;
 const methods:string[]=[];
 const storage=createRadarCoverStorage(settings,{
  canUpload:async()=>false,stage:async()=>{throw Error('unexpected');},publish:async()=>{throw Error('unexpected');},
  visible:async()=>visible,claimCleanup:async()=>cleanup,finishCleanup:async()=>{finished=true;}
 },async(_url,init)=>{
  methods.push(init!.method!);
  return init!.method==='GET'?new Response(new Uint8Array(16),{headers:{'content-type':'image/webp'}}):new Response(null,{status:404});
 });
 await expect(storage.upload(id,id,new Uint8Array(),'image/png')).rejects.toThrow('RADAR_COVER_FORBIDDEN');
 expect(await storage.read(id)).toBeNull();
 expect(await storage.cleanup(id,'addresses/'+id+'/photo/fake.webp')).toBe(false);
 expect(await storage.cleanup(id,key)).toBe(false);
 expect(methods).toEqual([]);
 visible=key;
 const result=await storage.read(id);
 expect(result?.headers.get('cache-control')).toBe('private, no-store');
 visible=null;cleanup=true;
 expect(await storage.cleanup(id,key)).toBe(true);
 expect(finished).toBe(true);
 expect(methods).toEqual(['GET','DELETE']);
});
