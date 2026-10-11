import { expect, test } from 'bun:test';
import { handleNewPublicRoutes } from '../new-address-publication';

test('public R2 media reads bytes without upload intents and rejects inactive records', async () => {
  const id='11111111-1111-4111-8111-111111111111';
  const mediaId='22222222-2222-4222-8222-222222222222';
  const key=`addresses/${id}/logo/${'a'.repeat(64)}.webp`;
  let active=true; const methods:string[]=[];
  const sql={unsafe:async(query:string)=>{
    expect(query.startsWith('SELECT')).toBe(true);
    return active?[{id,storage_key:key,media_type:'LOGO'}]:[];
  }} as any;
  const r2={rotationConfirmed:true as const,accountId:'a'.repeat(32),bucket:'direcciones507-media',accessKeyId:'test',secretAccessKey:'test'};
  const bytes=new TextEncoder().encode('RIFFxxxxWEBPtest');
  const http=(async(_url:any,init:any)=>{methods.push(init.method);return new Response(bytes,{headers:{'content-type':'image/webp'}});}) as typeof fetch;
  const request=()=>new Request(`https://direcciones507.com/v1/addresses/AD507-N123/media/${mediaId}`);
  const response=(await handleNewPublicRoutes(request(),{enabled:true,sql,r2,fetch:http}))!;
  expect(response.status).toBe(200);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(methods).toEqual(['GET']);
  active=false;
  expect((await handleNewPublicRoutes(request(),{enabled:true,sql,r2,fetch:http}))!.status).toBe(404);
  expect(methods).toEqual(['GET']);
  expect((await handleNewPublicRoutes(request(),{enabled:true,sql,r2:null,fetch:http}))!.status).toBe(503);
});
