import {expect,test} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import type {Sql} from 'postgres';
import sharp from 'sharp';
import {createRadarCoverRoutes} from '../radar/cover-routes';

test('Radar cover routes persist references, isolate owners and retry cleanup',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec('CREATE SCHEMA ad507; CREATE TABLE ad507.users(id uuid PRIMARY KEY);');
  for(const file of ['schema','ownership','registration-profiles','campaigns','private-covers']){
   await pg.exec(readFileSync(new URL('../radar/'+file+'.sql',import.meta.url),'utf8'));
  }
  const id='00000000-0000-4000-8000-000000000001';
  const owner='00000000-0000-4000-8000-000000000002';
  const other='00000000-0000-4000-8000-000000000003';
  await pg.query('INSERT INTO ad507.users VALUES($1),($2)',[owner,other]);
  await pg.query(`INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published)
   VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)`,[id,owner]);
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  await pg.query(`INSERT INTO radar.campaigns(establishment_id,kind,starts_at,ends_at,status)
   VALUES($1,'live',now()-interval '1 minute',now()+interval '1 hour','APPROVED')`,[id]);

  const db={
   unsafe:async(q:string,p:unknown[])=>(await pg.query(q,p)).rows,
   begin:(callback:(tx:unknown)=>Promise<unknown>)=>pg.transaction(tx=>callback({
    unsafe:async(q:string,p:unknown[])=>(await tx.query(q,p)).rows,
   })),
  } as unknown as Sql;
  const origin='https://direcciones.lat';
  const radar='https://radar.direcciones.lat';
  const manage=new URL('/v1/user/radar/business/cover?id='+id,origin);
  const view=new URL('/v1/radar/business/cover?id='+id,radar);
  const auth={currentUser:async(req:Request)=>({id:req.headers.get('x-test-account')??owner,roles:[]})};
  const env={RADAR_COMMERCIAL_MODEL_ENABLED:'true',AD507_R2_CONFIGURATION_VERIFIED:'true',R2_BUCKET:'direcciones507-media',
   R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'synthetic',R2_SECRET_ACCESS_KEY:'synthetic'};
  const objects=new Map<string,Buffer>();
  let failDelete=false;
  const http=(async(input,init)=>{
   const key=new URL(String(input)).pathname;
   if(init?.method==='PUT'){
    objects.set(key,Buffer.from(init.body as Uint8Array));
    return new Response(null,{status:201});
   }
   if(init?.method==='DELETE'){
    if(failDelete)return new Response(null,{status:503});
    return new Response(null,{status:objects.delete(key)?204:404});
   }
   const bytes=objects.get(key);
   return bytes?new Response(new Uint8Array(bytes),{headers:{'content-type':'image/webp'}}):new Response(null,{status:404});
  }) as typeof fetch;
  const image=await sharp({create:{width:12,height:12,channels:3,background:'blue'}}).png().toBuffer();
  const request=(method:string,account=owner,from=origin)=>new Request(manage,{
   method,headers:{origin:from,'x-test-account':account,'content-type':'image/png'},
   ...(method==='POST'?{body:new Uint8Array(image)}:{}),
  });
  const management=createRadarCoverRoutes(db,auth,env,origin,http);
  const publicCover=()=>createRadarCoverRoutes(db,auth,env,undefined,http)(new Request(view));
  expect((await createRadarCoverRoutes(db,auth,{},origin,http)(request('POST')))?.status).toBe(404);
  expect((await publicCover())?.status).toBe(404);
  expect((await management(request('POST',other)))?.status).toBe(403);
  expect((await management(request('POST',owner,radar)))?.status).toBe(403);
  expect(objects.size).toBe(0);
  expect((await management(request('POST')))?.status).toBe(200);
  expect((await publicCover())?.status).toBe(200);
  expect((await management(request('DELETE',other)))?.status).toBe(403);

  failDelete=true;
  expect(await (await management(request('POST')))?.json()).toEqual({ok:true,cleanupPending:true});
  expect(objects.size).toBe(2);
  expect((await pg.query("SELECT storage_key FROM radar.cover_objects WHERE state='current'")).rows).toHaveLength(1);
  failDelete=false;
  expect(await (await management(request('PATCH')))?.json()).toEqual({ok:true,cleanupPending:false});
  expect(objects.size).toBe(1);
  await pg.exec("UPDATE radar.campaigns SET ends_at=now()");
  expect((await publicCover())?.status).toBe(404);
  expect((await management(request('DELETE')))?.status).toBe(200);
  expect((await management(request('DELETE')))?.status).toBe(200);
  expect(objects.size).toBe(0);
  expect((await pg.query('SELECT * FROM radar.cover_objects')).rows).toHaveLength(0);
 }finally{await pg.close();}
},20000);
