import {test} from 'bun:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {createCoreRadarAdmin,withCoreRadarAdmin,installCoreRadarAdmin} from '../radar/core-admin';
import {createModerationStore} from '../radar/moderation-repository';
import {renderRadarAccount} from '../radar/account-panel';
const origin='https://direcciones.lat',id='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',adminId='00000000-0000-4000-8000-000000000003',other='00000000-0000-4000-8000-000000000004';
const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true'};
const admin={currentUser:async()=>({id:adminId,roles:['ADMIN']})};
function request(body:any,path='/v1/admin/radar',site=origin){return new Request(site+path,{method:'POST',headers:{origin:site},body:JSON.stringify(body)});}
test('CORE Radar admin fails closed for gates, hosts, origins, methods and non-admins before reading data',async()=>{
 let calls=0;const db={unsafe:async()=>{calls++;return [];}};
 for(const key of Object.keys(env))assert.equal((await createCoreRadarAdmin(db,admin,{...env,[key]:'false'})(request({action:'overview'})))!.status,503);
 const handler=createCoreRadarAdmin(db,admin,env);
 assert.equal(await handler(new Request(origin+'/unrelated')),null);
 assert.equal((await handler(request({action:'overview'},undefined,'https://radar.direcciones.lat')))!.status,403);
 assert.equal((await handler(new Request(origin+'/v1/admin/radar',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'})))!.status,403);
 assert.equal((await handler(new Request(origin+'/v1/admin/radar')))!.status,405);
 assert.equal((await handler(request({action:'verify_owner',id,accountRef:owner})))!.status,400);
 assert.equal((await createCoreRadarAdmin(db,{currentUser:async()=>({id:owner,roles:['CLIENT']})},env)(request({action:'overview'})))!.status,403);
 assert.equal(calls,0);
});
test('CORE forwards verification claims using session identity and blocks admin actions on the user path',async()=>{
 const calls:any[]=[];const db={unsafe:async(q:string,p:any[])=>{calls.push({q,p});return [{establishment_id:id}];}};
 const handler=createCoreRadarAdmin(db,{currentUser:async()=>({id:owner,roles:['CLIENT']})},env);
 const result=await handler(request({action:'claim',id,accountRef:other,reason:'Solicito verificación voluntaria'},'/v1/user/radar/verification'));
 assert.equal(result!.status,201);assert.equal(calls[0].p[1],owner);
 assert.equal((await handler(request({action:'verify_owner',id,accountRef:other,evidenceReviewed:true},'/v1/user/radar/verification')))!.status,400);
 const forwarded=new Request('http://direcciones.lat:8080/v1/user/radar/verification',{method:'POST',headers:{origin,'x-forwarded-proto':'https'},body:JSON.stringify({action:'claim',id,reason:'Solicito verificación voluntaria'})});
 assert.equal((await handler(forwarded))!.status,201);
});
test('manual verification and revocation audit atomically; audit failure rolls back ownership',async()=>{
 const pg=new PGlite();try{
  await pg.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY,display_name text);
   CREATE TABLE ad507.audit_log(id bigserial PRIMARY KEY,actor_user_id uuid REFERENCES ad507.users(id),actor_type text,action text,entity_type text,entity_id text,before_json jsonb,after_json jsonb);`);
  for(const file of ['schema.sql','ownership.sql','business-details.sql'])await pg.exec(readFileSync(new URL('../radar/'+file,import.meta.url),'utf8'));
  await pg.query('INSERT INTO ad507.users(id,display_name) VALUES($1,$2),($3,$4),($5,$6)',[owner,'Applicant',adminId,'Administrator',other,'Other account']);
  await pg.query("INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,'Synthetic','shop','PA',8,-80,true)",[id,owner]);
  await pg.query('INSERT INTO radar.ownership_requests(establishment_id,account_ref,reason) VALUES($1,$2,$3)',[id,owner,'Solicito verificación voluntaria']);
  const db={unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]},store=createModerationStore(db);
  const handler=createCoreRadarAdmin(db,admin,env);
  const overview=await (await handler(request({action:'overview'})))!.json();
  assert.equal(overview.requests[0].name,'Synthetic');assert.equal(overview.requests[0].accountName,'Applicant');assert.equal(overview.requests[0].email,undefined);
  assert.equal((await pg.query('SELECT * FROM radar.verified_owners')).rows.length,0);
  assert.equal((await handler(request({action:'verify_owner',id,accountRef:owner,evidenceReviewed:true})))!.status,200);
  assert.equal(await store.verifyOwner(id,owner,adminId),false);
  assert.equal(await store.revokeOwner(id,other,adminId),false);
  assert.equal(await store.revokeOwner(id,owner,adminId),true);
  const audits=(await pg.query('SELECT * FROM ad507.audit_log ORDER BY id')).rows as any[];
  assert.deepEqual(audits.map(a=>a.action),['RADAR_OWNER_VERIFIED','RADAR_OWNER_REVOKED']);assert.equal(audits[0].actor_user_id,adminId);
  assert.deepEqual(audits[0].after_json,{accountRef:owner,evidenceReviewed:true});
  // A failed audit must undo the INSERT, then the DELETE, in each single statement.
  await pg.exec("CREATE FUNCTION ad507.reject_radar_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$;CREATE TRIGGER reject_audit BEFORE INSERT ON ad507.audit_log FOR EACH ROW EXECUTE FUNCTION ad507.reject_radar_audit();");
  await assert.rejects(()=>store.verifyOwner(id,owner,adminId));assert.equal((await pg.query('SELECT * FROM radar.verified_owners')).rows.length,0);
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[id,owner]);
  await assert.rejects(()=>store.revokeOwner(id,owner,adminId));assert.equal((await pg.query('SELECT * FROM radar.verified_owners')).rows.length,1);
 }finally{await pg.close();}
},20000);

function ui(){
 const nodes:any={};const doc:any={getElementById:(id:string)=>nodes[id],createElement:(tag:string)=>({tag,children:[] as any[],textContent:'',disabled:false,checked:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v:any[]){this.children.push(...v);},replaceChildren(...v:any[]){this.children=v;}})};
 for(const id of ['radarTile','radarView','radarAdminRows','radarClose','radarAccountSection','radarAccountItems'])nodes[id]=doc.createElement('div');
 return {doc,nodes};
}
test('central ADMIN uses text nodes and explicit evidence confirmation, without manual ID fields',async()=>{
 const u=ui(),calls:any[]=[];
 const send=async(body:any)=>{calls.push(body);return {ok:true,json:async()=>({requests:[{id,accountRef:owner,name:'<img src=x onerror=alert(1)>',accountName:'Applicant',country:'PA'}],owners:[],pending:[]})};};
 installCoreRadarAdmin(u.doc,send);await u.nodes.radarTile.onclick();
 const row=u.nodes.radarAdminRows.children.find((n:any)=>n.tag==='article');assert.equal(row.children[0].textContent,'<img src=x onerror=alert(1)>');
 const check=row.children.find((n:any)=>n.tag==='label').children[0],button=row.children.find((n:any)=>n.tag==='button');
 assert.equal(button.disabled,true);check.checked=true;check.onchange();assert.equal(button.disabled,false);
 await button.onclick();assert.equal(calls.length,1);await button.onclick();
 assert.deepEqual(calls[1],{action:'verify_owner',id,accountRef:owner,evidenceReviewed:true});
 const html='<body><button id="statsTile"></button></main></body>';
 assert.equal(withCoreRadarAdmin(html,{}),html);const rendered=withCoreRadarAdmin(html,env);assert.match(rendered,/radarTile/);assert.match(rendered,/radarView/);
 for(const match of rendered.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(match[1]);
});
test('declared owner requests voluntary verification from CORE without sending identity or evidence files',async()=>{
 const u=ui(),calls:any[]=[];
 renderRadarAccount({available:true,verificationAvailable:true,items:[{id,name:'Synthetic',declared:true,authorized:false,requested:false}]},u.doc,async(body:any)=>{calls.push(body);return {ok:true};});
 const row=u.nodes.radarAccountItems.children[0],button=row.children.find((n:any)=>n.tag==='button');assert.ok(button);await button.onclick();
 assert.deepEqual(Object.keys(calls[0]).sort(),['action','id','reason']);assert.equal(calls[0].action,'claim');assert.equal(button.disabled,true);
 const v=ui();runInNewContext('('+renderRadarAccount.toString()+')(data,document,send);',{data:{available:true,items:[]},document:v.doc,send:async()=>({ok:true})});
});
