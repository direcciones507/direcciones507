import {test,expect} from 'bun:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {retireRadarPin} from '../radar/pin-retirement';
import {createRadarRepository} from '../radar/repository';
import {createCoreRadarAdmin} from '../radar/core-admin';
import {radarAccountScript} from '../radar/account-panel';

const author='00000000-0000-4000-8000-000000000002',stranger='00000000-0000-4000-8000-000000000003';
const ids=['00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013'];
async function fixture(){
 const pg=new PGlite();
 await pg.exec(`CREATE SCHEMA ad507;CREATE TABLE ad507.users(id uuid PRIMARY KEY);
  CREATE TABLE ad507.audit_log(actor_user_id uuid,actor_type text,action text,entity_type text,entity_id text,metadata jsonb);`);
 for(const file of ['schema.sql','ownership.sql','business-details.sql','registration-profiles.sql','campaigns.sql'])await pg.exec(readFileSync(new URL('../radar/'+file,import.meta.url),'utf8'));
 await pg.query('INSERT INTO ad507.users(id) VALUES($1),($2)',[author,stranger]);
 for(let i=0;i<3;i++)await pg.query('INSERT INTO radar.establishments(id,account_ref,name,category,country,latitude,longitude,published) VALUES($1,$2,$3,$4,$5,$6,$7,true)',[ids[i],author,'PIN de prueba '+(i+1),'shop','PA',8.1,-80.1]);
 const db={unsafe:async(q:string,p:any[])=>(await pg.query(q,p)).rows as any[]};
 return {pg,db};
}
test('only the originating account retires one of several colocated published PINs with an atomic audit record',async()=>{
 const {pg,db}=await fixture();
 try{
  assert.equal(await retireRadarPin(db,ids[0],stranger,'PIN de prueba 1'),false);
  assert.equal(await retireRadarPin(db,ids[0],author,'PIN equivocado'),false);
  assert.equal(await retireRadarPin(db,ids[0],author,'PIN de prueba 1'),true);
  assert.equal(await retireRadarPin(db,ids[0],author,'PIN de prueba 1'),false);
  const rows=await pg.query('SELECT id,published FROM radar.establishments ORDER BY id');
  assert.deepEqual(rows.rows.map((r:any)=>r.published),[false,true,true]);
  const listed=await createRadarRepository(db).listPublished('PA',{west:-81,east:-79,south:7,north:9});
  assert.equal(listed.length,2);
  const audit=await pg.query("SELECT action,actor_user_id,metadata FROM ad507.audit_log WHERE action='RADAR_PIN_RETIRED'");
  assert.equal(audit.rows.length,1);assert.equal(audit.rows[0].actor_user_id,author);
  assert.equal(audit.rows[0].metadata.published,false);
 }finally{await pg.close();}
});
test('linked digital addresses, approved campaigns and another verified owner block self-retirement',async()=>{
 const {pg,db}=await fixture();
 try{
  await pg.query('UPDATE radar.establishments SET digital_address_ref=$2 WHERE id=$1',[ids[0],'00000000-0000-4000-8000-000000000090']);
  await pg.query("INSERT INTO radar.campaigns(establishment_id,kind,starts_at,ends_at,status) VALUES($1,'live',now()-interval '1 day',now()+interval '1 day','APPROVED')",[ids[1]]);
  await pg.query('INSERT INTO radar.verified_owners(establishment_id,account_ref) VALUES($1,$2)',[ids[2],stranger]);
  assert.equal(await retireRadarPin(db,ids[0],author,'PIN de prueba 1'),false);
  assert.equal(await retireRadarPin(db,ids[1],author,'PIN de prueba 2'),false);
  assert.equal(await retireRadarPin(db,ids[2],author,'PIN de prueba 3'),false);
  assert.equal(await retireRadarPin(db,ids[2],stranger,'PIN de prueba 3'),true);
  const published=(await pg.query('SELECT published FROM radar.establishments ORDER BY id')).rows.map((r:any)=>r.published);
  assert.deepEqual(published,[true,true,false]);
 }finally{await pg.close();}
});
test('audit failure rolls back pin retirement and CORE denies foreign Origin or missing account',async()=>{
 const {pg,db}=await fixture();
 try{
  const env={RADAR_ENABLED:'true',RADAR_OWNERSHIP_ENABLED:'true',RADAR_BUSINESS_DETAILS_ENABLED:'true',RADAR_CORE_ADMIN_ENABLED:'true',RADAR_REGISTRATION_PROFILES_ENABLED:'true'};
  const auth={currentUser:async()=>({id:author,roles:['CLIENT']})};
  const handle=createCoreRadarAdmin(db,auth,env);
  const url='https://direcciones.lat/v1/user/radar/business',body=JSON.stringify({action:'retire',id:ids[0],confirmName:'PIN de prueba 1'});
  assert.equal((await handle(new Request(url,{method:'POST',headers:{origin:'https://unauthorized.example'},body})))?.status,403);
  assert.equal((await handle(new Request(url,{method:'POST',headers:{origin:'https://direcciones.lat'},body:JSON.stringify({action:'retire',id:ids[0],confirmName:'Otro'})})))?.status,403);
  await pg.exec("CREATE FUNCTION ad507.reject_self_retire() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit denied'; END $$;CREATE TRIGGER reject_retire BEFORE INSERT ON ad507.audit_log FOR EACH ROW EXECUTE FUNCTION ad507.reject_self_retire();");
  await assert.rejects(()=>retireRadarPin(db,ids[0],author,'PIN de prueba 1'));
  assert.equal((await pg.query('SELECT published FROM radar.establishments WHERE id=$1',[ids[0]])).rows[0].published,true);
 }finally{await pg.close();}
});
test('community contributor sees a separate two-step retire button and successful removal status',async()=>{
 function node(tag='div'):any{return {tag,children:[] as any[],textContent:'',style:{},hidden:false,disabled:false,className:'',classList:{toggle(){}},setAttribute(){},append(...v:any[]){this.children.push(...v);},replaceChildren(...v:any[]){this.children=v;}};}
 const nodes:any={radarAccountSection:node(),radarAccountItems:node()};
 const document:any={getElementById:(id:string)=>nodes[id],createElement:(tag:string)=>node(tag)};
 const calls:any[]=[];
 const data={available:true,items:[{id:ids[0],name:'PIN de prueba 1',country:'PA',category:'shop',submitted:true,declared:false,authorized:false}]};
 runInNewContext(radarAccountScript+';renderRadarAccount(data,document);',{data,document,fetch:async(_u:string,options:any)=>{calls.push(JSON.parse(options.body));return {ok:true};}});
 const row=nodes.radarAccountItems.children[0];
 const retire=row.children.find((x:any)=>x.tag==='button'&&x.textContent==='Retirar mi PIN');
 assert.ok(retire);
 await retire.onclick();
 const confirm=row.children.find((x:any)=>x.tag==='div');
 assert.equal(confirm.hidden,false);
 await confirm.children.find((x:any)=>x.textContent==='Sí, retirar este PIN').onclick();
 assert.deepEqual(calls[0],{action:'retire',id:ids[0],confirmName:'PIN de prueba 1'});
 assert.match(row.children[0].textContent,/PIN retirado/);
});
