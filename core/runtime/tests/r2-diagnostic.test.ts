import {test,expect} from 'bun:test';
import {diagnoseR2} from '../scripts/r2-diagnostic';
const env={R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'direcciones507-media',R2_ACCESS_KEY_ID:'fixture-access',R2_SECRET_ACCESS_KEY:'fixture-secret'};
test('unsigned R2 400 passes only for the exact Invalid Authorization response',async()=>{
 for(const message of ['Invalid Authorization','Other error']){
  let data:Uint8Array|undefined;
  const http=(async(_:any,init:any)=>{
   if(!init.headers?.authorization)return new Response('<Code>InvalidArgument</Code><Message>'+message+'</Message>',{status:400});
   if(init.method==='PUT'){data=init.body;return new Response(null,{status:200});}
   if(init.method==='DELETE'){data=undefined;return new Response(null,{status:204});}
   return data?new Response(data):new Response('<Code>NoSuchKey</Code>',{status:404});
  }) as typeof fetch;
  const r=await diagnoseR2(env,http,{photo:true,verifyPrivateAccess:true});expect(r.privateAccess?.http).toBe(400);expect(r.privateAccess?.ok).toBe(message==='Invalid Authorization');expect(r.ok).toBe(message==='Invalid Authorization');expect(r.cleanupRequired).toBe(false);
 }
});
test('photo diagnostic checks signed WebP bytes, private access and cleanup using only its temporary key',async()=>{
 let data:Uint8Array|undefined;const methods:string[]=[];
 const http=(async(url:any,init:any)=>{
  expect(String(url)).toMatch(/\/_diagnostics\/ad507-r2\/[a-f0-9-]+\.webp$/);
  if(!init.headers?.authorization){methods.push('UNSIGNED_GET');return new Response(null,{status:403});}
  methods.push(init.method);expect(init.headers['content-type']).toBe('image/webp');
  if(init.method==='PUT'){data=init.body;expect(Buffer.from(data!).subarray(8,12).toString()).toBe('WEBP');return new Response(null,{status:200});}
  if(init.method==='DELETE'){data=undefined;return new Response(null,{status:204});}
  return data?new Response(data,{headers:{'content-type':'image/webp'}}):new Response('<Code>NoSuchKey</Code>',{status:404});
 }) as typeof fetch;
 const r=await diagnoseR2(env,http,{photo:true,verifyPrivateAccess:true});expect(r.ok).toBe(true);expect(r.privateAccess).toEqual({ok:true,http:403});expect(r.access).toBe('SIGNED_R2_ONLY');expect(r.objectUrl).toStartWith('r2://direcciones507-media/_diagnostics/');expect(r.cleanupRequired).toBe(false);expect(methods).toEqual(['PUT','GET','UNSIGNED_GET','DELETE','GET']);
 for(const secret of [env.R2_ACCESS_KEY_ID,env.R2_SECRET_ACCESS_KEY,env.R2_ACCOUNT_ID])expect(JSON.stringify(r)).not.toContain(secret);
});
test('diagnostic writes unique temporary key, compares bytes and verifies deletion without leaking secrets',async()=>{
  let data:Uint8Array|undefined;const calls:any[]=[];
  const http=(async(url:any,init:any)=>{
    calls.push({url:String(url),method:init.method});expect(String(url)).toContain('/direcciones507-media/_diagnostics/ad507-r2/');
    if(init.method==='PUT'){expect(init.headers['if-none-match']).toBe('*');data=init.body;return new Response(null,{status:200});}
    if(init.method==='DELETE'){data=undefined;return new Response(null,{status:204});}
    return data?new Response(data):new Response('<Error><Code>NoSuchKey</Code></Error>',{status:404});
  }) as typeof fetch;
  const result=await diagnoseR2(env,http);expect(result.ok).toBe(true);expect(result.cleanupRequired).toBe(false);expect(calls.map(v=>v.method)).toEqual(['PUT','GET','DELETE','GET']);
  const text=JSON.stringify(result);for(const value of [env.R2_ACCOUNT_ID,env.R2_ACCESS_KEY_ID,env.R2_SECRET_ACCESS_KEY])expect(text).not.toContain(value);
});
test('diagnostic rejects wrong bucket before traffic and never deletes a preexisting object',async()=>{
  let calls=0;expect((await diagnoseR2({...env,R2_BUCKET:'other'},(async()=>{calls++;throw Error();}) as typeof fetch)).configuration.bucketMatches).toBe(false);expect(calls).toBe(0);
  const methods:string[]=[];const result=await diagnoseR2(env,(async(_:any,init:any)=>{methods.push(init.method);return new Response('<Code>PreconditionFailed</Code>',{status:412});}) as typeof fetch);
  expect(result.ok).toBe(false);expect(result.write?.code).toBe('PreconditionFailed');expect(methods).toEqual(['PUT']);
});
test('failed read still cleans up and denied deletion is reported precisely',async()=>{
  const methods:string[]=[];const result=await diagnoseR2(env,(async(_:any,init:any)=>{methods.push(init.method);return init.method==='PUT'?new Response(null,{status:200}):new Response('<Code>AccessDenied</Code>',{status:403});}) as typeof fetch);
  expect(methods).toEqual(['PUT','GET','DELETE']);expect(result.read?.code).toBe('AccessDenied');expect(result.delete?.code).toBe('AccessDenied');expect(result.cleanupRequired).toBe(true);expect(result.ok).toBe(false);
});
test('uncertain PUT tries cleanup; content mismatch cannot pass; errors redact provider response',async()=>{
  let count=0;const result=await diagnoseR2(env,(async(_:any,init:any)=>{count++;if(count===1)throw Error('fixture-secret');return init.method==='DELETE'?new Response(null,{status:204}):new Response('<Code>NoSuchKey</Code>',{status:404});}) as typeof fetch);
  expect(result.write?.code).toBe('NETWORK_OR_TLS_ERROR');expect(result.cleanupRequired).toBe(false);expect(JSON.stringify(result)).not.toContain('fixture-secret');
  const mismatch=await diagnoseR2(env,(async(_:any,init:any)=>init.method==='PUT'||init.method==='DELETE'?new Response(null,{status:200}):new Response('wrong',{status:200})) as typeof fetch);
  expect(mismatch.read?.ok).toBe(false);expect(mismatch.ok).toBe(false);expect(mismatch.cleanupRequired).toBe(true);
});
