import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createCommercialManagement} from '../radar/commercial-management';
import {createCoreRadarAdmin} from '../radar/core-admin';
import {createRadarRepository} from '../radar/repository';
import {radarPresentation} from '../radar/presentation';
import {renderCommercialDetails} from '../radar/ui/commercial-details.js';
const id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const profile={province:'Panamá',locality:'Santiago',description:'Comercio de ejemplo',phone:'+507 6000-0000',hours:{monday:'08:00-17:00'},socials:['https://example.test/'],extras:{products:'Productos de ejemplo'}};
const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true',RADAR_REGISTRATION_PROFILES_ENABLED:'true'};
test('commercial editing requires exact ownership, preserves original author and capacity, and rolls back without audit',async()=>{
 const pg=new PGlite();try{
  await pg.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY,display_name text);
   CREATE TABLE ad507.audit_log(actor_user_id uuid,actor_type text,action text,entity_type text,entity_id text,metadata jsonb);`);
  for(const file of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql'])await pg.exec(readFileSync(new URL('../radar/'+file,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[owner,other]);
  await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,other]);
  const db={unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]},store=createCommercialManagement(db);
  assert.equal(await store.inspect(id,owner),null);assert.equal(await store.update(id,other,profile),'OWNER_REQUIRED');
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  await pg.query('INSERT INTO radar.registration_profiles(establishment_id,submitted_by,profile) VALUES($1,$2,$3)',[id,other,JSON.stringify(profile)]);
  await pg.query("INSERT INTO radar.business_details(establishment_id,updated_by,hours,quantity,unit) VALUES($1,$2,'{}',10,'tables')",[id,owner]);
  const updated={...profile,description:'Ficha editada',hours:{monday:'closed'}};
  assert.equal(await store.update(id,owner,updated),'UPDATED');
  const row=(await pg.query('SELECT * FROM radar.registration_profiles')).rows[0] as any;assert.equal(row.submitted_by,other);assert.equal(row.profile.description,'Ficha editada');
  const visible=await createRadarRepository(db,true,undefined,true,true).listPublished('PA',{west:-83,south:7,east:-77,north:10});assert.equal(visible[0].verifiedOwner,true);
  const details=(await pg.query('SELECT * FROM radar.business_details')).rows[0] as any;assert.equal(details.quantity,10);assert.equal(details.unit,'tables');assert.deepEqual(details.hours,{monday:'closed'});
  assert.equal(await store.update(id,owner,{...updated,socials:['javascript:alert(1)']}),'INVALID_PROFILE');
  await pg.exec("CREATE FUNCTION ad507.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;CREATE TRIGGER fail_audit BEFORE INSERT ON ad507.audit_log FOR EACH ROW EXECUTE FUNCTION ad507.fail_audit();");
  await assert.rejects(()=>store.update(id,owner,{...profile,description:'Must roll back'}));
  assert.equal((await store.inspect(id,owner)).profile.description,'Ficha editada');assert.deepEqual(((await pg.query('SELECT hours FROM radar.business_details')).rows[0] as any).hours,{monday:'closed'});
  await pg.query('DELETE FROM radar.verified_owners WHERE establishment_id=$1',[id]);assert.equal(await store.update(id,owner,profile),'OWNER_REQUIRED');
 }finally{await pg.close();}
},20000);
test('unverified registrant can edit their submitted public profile but not availability or others records',async()=>{
 const pg=new PGlite();try{
  await pg.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);
   CREATE TABLE ad507.audit_log(actor_user_id uuid,actor_type text,action text,entity_type text,entity_id text,metadata jsonb);`);
  for(const file of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql'])await pg.exec(readFileSync(new URL('../radar/'+file,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[owner,other]);
  await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
  await pg.query('INSERT INTO radar.registration_profiles(establishment_id,submitted_by,profile) VALUES($1,$2,$3)',[id,owner,JSON.stringify(profile)]);
  const db={unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]},store=createCommercialManagement(db);
  assert.equal((await store.inspect(id,owner)).verified,false);
  assert.equal(await store.inspect(id,other),null);
  assert.equal(await store.updateSubmitted(id,other,profile),'OWNER_REQUIRED');
  assert.equal(await store.updateSubmitted(id,owner,{...profile,description:'Corregida'}),'UPDATED');
  assert.equal((await store.inspect(id,owner)).profile.description,'Corregida');
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM radar.verified_owners')).rows[0].n,0);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM radar.business_details')).rows[0].n,0);
  const auth={currentUser:async()=>({id:owner,roles:['CLIENT']})},handle=createCoreRadarAdmin(db,auth,env);
  const req=(data:any)=>new Request('https://direcciones.lat/v1/user/radar/business',{method:'POST',headers:{origin:'https://direcciones.lat'},body:JSON.stringify(data)});
  assert.equal((await handle(req({action:'availability',id,quantity:5})))!.status,403);
  assert.equal((await handle(req({action:'update',id,profile,availability:{quantity:5,unit:'tables'}})))!.status,403);
  assert.equal((await handle(req({action:'update',id,profile:{...profile,description:'Actualizada'}})))!.status,200);
  assert.equal((await store.inspect(id,owner)).profile.description,'Actualizada');
 }finally{await pg.close();}
},20000);
test('CORE editing gate, session identity, invalid actions and search pagination are enforced',async()=>{
 const calls:any[]=[],db={unsafe:async(q:string,p:any[])=>{calls.push({q,p});return [];}};
 const auth={currentUser:async()=>({id:owner,roles:['CLIENT']})};const url='https://direcciones.lat/v1/user/radar/business';
 const req=(body:any)=>new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'},body:JSON.stringify(body)});
 assert.equal((await createCoreRadarAdmin(db,auth,{...env,RADAR_REGISTRATION_PROFILES_ENABLED:'false'})(req({action:'inspect',id})))!.status,503);
 const handle=createCoreRadarAdmin(db,auth,env);assert.equal((await handle(req({action:'inspect',id,accountRef:other})))!.status,403);assert.deepEqual(calls[0].p,[id,owner]);
 assert.equal((await handle(req({action:'verify_owner',id})))!.status,400);
 const admin=createCoreRadarAdmin(db,{currentUser:async()=>({id:owner,roles:['ADMIN']})},env);
 const query=(body:any)=>new Request('https://direcciones.lat/v1/admin/radar',{method:'POST',headers:{origin:'https://direcciones.lat'},body:JSON.stringify(body)});
 assert.equal((await admin(query({action:'overview',offset:-1})))!.status,400);
 const result=await admin(query({action:'overview',offset:100,q:"' OR true --"}));assert.equal(result!.status,200);for(const call of calls.slice(1))assert.deepEqual(call.p,["' OR true --",100]);
});
test('public profile rendering uses one effective schedule, safe links and server-derived verification only',()=>{
 const nodes:any[]=[],doc:any={createElement:(tag:string)=>({tag,textContent:''})},target={append:(n:any)=>nodes.push(n)};
 renderCommercialDetails(target,{verifiedOwner:true,registrationProfile:{...profile,description:'<script>unsafe()</script>',socials:['javascript:alert(1)','https://user:pass@example.test/','https://example.test/']},details:{hours:{monday:'closed'},quantity:0,unit:'tables'}},doc);
 assert.equal(nodes.filter(n=>n.tag==='h4').length,1);assert.ok(nodes.find(n=>n.textContent==='Lunes: Cerrado'));assert.ok(!nodes.find(n=>n.textContent.includes('08:00')));
 assert.equal(nodes.filter(n=>n.tag==='a').length,1);assert.ok(!nodes.find(n=>String(n.href||'').startsWith('tel:')));assert.ok(nodes.find(n=>n.textContent==='<script>unsafe()</script>'));assert.ok(nodes.find(n=>n.textContent==='0 mesas disponibles'));
});
test('retired public ADMIN never reappears when gates are closed; privacy resolves to CORE',async()=>{
 const request=new Request('https://radar.direcciones.lat/');
 const retired=await (await radarPresentation(request,env))!.text();assert.ok(!retired.includes('id="ownerForm"'));assert.ok(!retired.includes('id="adminDialog"'));assert.ok(retired.includes('href="https://direcciones.lat/admin"'));assert.ok(retired.includes('https://direcciones.lat/legal/privacy'));
 const fallback=await (await radarPresentation(request,{RADAR_ENABLED:'true'}))!.text();assert.ok(!fallback.includes('id="ownerForm"'));
 const source=readFileSync(new URL('../radar/ui/radar.js',import.meta.url),'utf8');assert.ok(!source.includes('Administrar o reclamar esta ficha'));
});

test('public card does not confuse declared total capacity with availability',()=>{
 const nodes:any[]=[],doc:any={createElement:(tag:string)=>({tag,textContent:''})},target={append:(n:any)=>nodes.push(n)};
 renderCommercialDetails(target,{registrationProfile:{capacity:{total:12,unit:'tables'}},details:null},doc);
 assert.ok(nodes.find(n=>n.textContent==='Capacidad total: 12 mesas'));assert.ok(!nodes.some(n=>n.textContent.includes('disponibles')));
});

test('WhatsApp is explicit and cannot use an arbitrary URL',async()=>{const {commercialWhatsapp}=await import('../radar/ui/commercial-details.js');const node=()=>({setAttribute(){},append(){}});const doc:any={createElement:node,createElementNS:node};assert.equal(commercialWhatsapp({registrationProfile:{phone:'+50760000000'}},doc),null);assert.equal(commercialWhatsapp({registrationProfile:{whatsapp:'https://evil.test'}},doc),null);assert.equal(commercialWhatsapp({registrationProfile:{whatsapp:'+50760000000'}},doc)?.href,'https://wa.me/50760000000');});
