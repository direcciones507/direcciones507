import {test,expect} from 'bun:test';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {createCoreRadarAdmin} from '../radar/core-admin';
import {radarAccountData,radarAccountScript} from '../radar/account-panel';
import {createRadarRepository} from '../radar/repository';
import {userPanelPresentation} from '../user-panel';
import {panelLogoutDestination} from '../panel-address-card';
const owner='00000000-0000-4000-8000-000000000002';
const stranger='00000000-0000-4000-8000-000000000003';
const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true',RADAR_REGISTRATION_PROFILES_ENABLED:'true'};
const draft={name:'Restaurante dueño sintético',category:'restaurant',country:'PA',latitude:8.9824,longitude:-79.5199,registrationKind:'owner',profile:{province:'Panamá',locality:'Ciudad de Panamá',description:'Comida de prueba, sin datos reales',phone:'',hours:{monday:'08:00-17:00'},socials:[],extras:{cuisine:'Panameña'},capacity:{total:12,unit:'tables'}}};
async function setup(){
 const pg=new PGlite();
 await pg.exec('CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);CREATE TABLE ad507.audit_log(actor_user_id uuid,actor_type text,action text,entity_type text,entity_id text,metadata jsonb,before_json jsonb,after_json jsonb);');
 for(const name of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql'])await pg.exec(readFileSync(new URL('../radar/'+name,import.meta.url),'utf8'));
 await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[owner,stranger]);
 const db={unsafe:async(query:string,args:any[])=>(await pg.query(query,args)).rows as any[]};
 return {pg,db};
}
const req=(body:unknown,origin='https://direcciones.lat')=>new Request('https://direcciones.lat/v1/user/radar/business',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('CORE owner registers from My panel using current account, and can immediately manage capacity',async()=>{
 const {pg,db}=await setup();
 try{
  const handle=createCoreRadarAdmin(db,{currentUser:async()=>({id:owner,roles:['CLIENT']})},env);
  const before=await radarAccountData(db,owner,env);
  expect(before?.managementAvailable).toBe(true);
  expect(before?.items).toHaveLength(0);
  expect((await handle(req({action:'catalog'})))?.status).toBe(200);
  const result=(await handle(req({action:'register',draft})))!;
  expect(result.status).toBe(201);const data=await result.json();
  expect(data.status).toBe('published');
  expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
  const after=await radarAccountData(db,owner,env);
  expect(after?.items).toHaveLength(1);
  expect(after?.items[0].canManage).toBe(true);
  expect(after?.items[0].declared).toBe(true);
  expect(after?.items[0].authorized).toBe(false); // No automatic verified badge
  const listed=await createRadarRepository(db).listPublished('PA',{west:-81,south:8,east:-78,north:10});
  expect(listed).toHaveLength(1);
  const inspect=(await handle(req({action:'inspect',id:data.id})))!;
  expect(inspect.status).toBe(200);
  const available=(await handle(req({action:'availability',id:data.id,quantity:3})))!;
  expect(available.status).toBe(200);
  expect((await radarAccountData(db,owner,env))?.items[0].quantity).toBe(3);
  expect((await handle(req({action:'register',draft})))?.status).toBe(409); // No duplicate PIN
 }finally{await pg.close();}
});
test('owner creation denies a stranger, invalid validation, disallowed Origin and disabled feature gate',async()=>{
 const {pg,db}=await setup();
 try{
  const auth={currentUser:async()=>({id:owner,roles:['CLIENT']})};
  const handler=createCoreRadarAdmin(db,auth,env);
  expect((await handler(req({action:'register',draft},'https://evil.example')))?.status).toBe(403);
  expect((await createCoreRadarAdmin(db,{currentUser:async()=>null},env)(req({action:'register',draft})))?.status).toBe(403);
  expect((await handler(req({action:'register',draft:{...draft,registrationKind:'user'}})))?.status).toBe(400);
  expect((await handler(req({action:'register',draft:{...draft,latitude:100}})))?.status).toBe(400);
  expect((await createCoreRadarAdmin(db,auth,{...env,RADAR_REGISTRATION_PROFILES_ENABLED:'false'})(req({action:'register',draft})))?.status).toBe(503);
  const created=await handler(req({action:'register',draft}));expect(created?.status).toBe(201);
  const id=(await created!.json()).id;
  const foreign=createCoreRadarAdmin(db,{currentUser:async()=>({id:stranger,roles:['CLIENT']})},env);
  expect((await foreign(req({action:'inspect',id})))?.status).toBe(403);
  expect((await foreign(req({action:'availability',id,quantity:1})))?.status).toBe(403);
  const other=await radarAccountData(db,stranger,env);
  expect(other?.items).toHaveLength(0);
 }finally{await pg.close();}
});
test('serialized panel registration script parses and retains stable Radar-only returns',()=>{
 expect(()=>new Script(radarAccountScript)).not.toThrow();
 const html=userPanelPresentation(new URL('https://direcciones.lat/panel?radar=1&addLocal=1'));
 expect(html).toContain('id="radarOwnerCreateButton"');
 expect(html).toContain('id="radarOwnerRegistration"');
 expect(html).toContain('id="radarAccountSection"');
 expect(html).toContain('Continuar en Radar');
 expect(panelLogoutDestination('https://direcciones.lat/panel?radar=1&addLocal=1')).toBe('https://radar.direcciones.lat/');
});
