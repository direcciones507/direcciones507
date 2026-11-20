import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createModerationStore} from '../radar/moderation-repository';
import {createCommercialManagement} from '../radar/commercial-management';
import {radarPresentation} from '../radar/presentation';
const id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003';
const profile={province:'Panamá',locality:'Santiago',description:'Comercio de prueba',phone:'',hours:{monday:'08:00-17:00'},socials:[],extras:{products:'Ejemplo'}};
async function fixture(){
 const pg=new PGlite();await pg.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);
 CREATE TABLE ad507.audit_log(actor_user_id uuid,actor_type text,action text,entity_type text,entity_id text,before_json jsonb,after_json jsonb,metadata jsonb);`);
 for(const file of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql'])await pg.exec(readFileSync(new URL('../radar/'+file,import.meta.url),'utf8'));
 await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[owner,admin]);
 await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
 return {pg,db:{unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]}};
}
test('CORE review can approve only the account with a matching submitted verification request',async()=>{
 const {pg,db}=await fixture();try{
  const store=createModerationStore(db,true);
  assert.equal(await store.verifyOwner(id,owner,admin),false);
  await pg.query('INSERT INTO radar.ownership_requests(establishment_id,account_ref,reason) VALUES($1,$2,$3)',[id,admin,'Solicitud de otra cuenta']);
  assert.equal(await store.verifyOwner(id,owner,admin),false);
  await pg.query('INSERT INTO radar.ownership_requests(establishment_id,account_ref,reason) VALUES($1,$2,$3)',[id,owner,'Solicitud del titular']);
  assert.equal(await store.verifyOwner(id,owner,admin),true);assert.equal(await store.verifyOwner(id,owner,admin),false);
  assert.equal(await store.revokeOwner(id,owner,admin),true);assert.equal(await createCommercialManagement(db).inspect(id,owner),null);
  assert.deepEqual((await pg.query('SELECT action FROM ad507.audit_log')).rows.map((r:any)=>r.action),['RADAR_OWNER_VERIFIED','RADAR_OWNER_REVOKED']);
 }finally{await pg.close();}
},20000);
test('CORE replaces legacy capacity controls and rolls capacity back with the profile if auditing fails',async()=>{
 const {pg,db}=await fixture();try{
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  const store=createCommercialManagement(db);
  assert.equal(await store.update(id,owner,profile,{quantity:12,unit:'rooms'}),'UPDATED');
  const item=await store.inspect(id,owner);assert.equal(item.quantity,12);assert.equal(item.unit,'rooms');
  assert.equal(await store.update(id,owner,profile,{quantity:-1,unit:'rooms'}),'INVALID_PROFILE');
  assert.equal(await store.update(id,owner,profile,{quantity:1.5,unit:'rooms'}),'INVALID_PROFILE');
  assert.equal(await store.update(id,owner,profile,{quantity:1,unit:'invented'}),'INVALID_PROFILE');
  await pg.exec("CREATE FUNCTION ad507.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;CREATE TRIGGER fail_audit BEFORE INSERT ON ad507.audit_log FOR EACH ROW EXECUTE FUNCTION ad507.fail_audit();");
  await assert.rejects(()=>store.update(id,owner,{...profile,description:'Must roll back'},{quantity:0,unit:'tables'}));
  const unchanged=await store.inspect(id,owner);assert.equal(unchanged.quantity,12);assert.equal(unchanged.unit,'rooms');assert.equal(unchanged.profile.description,profile.description);
 }finally{await pg.close();}
},20000);
test('old administration and claim forms are retired at source and never return when gates close',async()=>{
 for(const env of [{RADAR_ENABLED:'true'},{RADAR_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true'}]){
  const html=await (await radarPresentation(new Request('https://radar.direcciones.lat/'),env))!.text();
  assert.ok(html.includes('href="https://direcciones.lat/admin"'));
  for(const name of ['adminDialog','ownerDialog','ownerForm','businessForm','claimForm'])assert.ok(!html.includes('id="'+name+'"'));
 }
 const js=readFileSync(new URL('../radar/ui/radar.js',import.meta.url),'utf8');
 for(const legacy of ['pendingItems','openBusiness','ownershipRequests','Administrar o reclamar'])assert.ok(!js.includes(legacy));
 assert.ok(js.includes("location.assign('https://direcciones.lat/panel')"));assert.ok(!js.includes('¿Deseas cerrarla en Radar?'));
 const editor=readFileSync(new URL('../radar/commercial-editor.ts',import.meta.url),'utf8');assert.ok(editor.includes('Cantidad disponible'));assert.ok(editor.includes('availability:{quantity:'));
});
