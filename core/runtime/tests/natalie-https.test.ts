import {beforeAll,afterAll,test,expect} from 'bun:test';
import postgres from 'postgres';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {diagnoseNatalie} from '../scripts/natalie-diagnostic';
const dir=mkdtempSync(join(tmpdir(),'ad507-natalie-https-'));
let db:ReturnType<typeof postgres>,runtime:ReturnType<typeof Bun.spawn>,base:string;
const pa='https://direcciones507.com',lat='https://direcciones.lat';
const org=crypto.randomUUID(),product=crypto.randomUUID(),agent=crypto.randomUUID();
beforeAll(async()=>{
 const database=process.env.AD507_TEST_DATABASE_URL;
 if(!database||!['127.0.0.1','localhost'].includes(new URL(database).hostname))throw Error('DISPOSABLE_LOCAL_DATABASE_REQUIRED');
 db=postgres(database,{max:3});
 await db.unsafe(`CREATE SCHEMA IF NOT EXISTS ad507;
 CREATE TABLE ad507.ad507_organizations(organization_id uuid PRIMARY KEY,organization_key text);
 CREATE TABLE ad507.ad507_products(product_id uuid PRIMARY KEY,organization_id uuid,product_key text);
 CREATE TABLE ad507.ad507_agents(agent_id uuid PRIMARY KEY,organization_id uuid,product_id uuid,agent_key text,status text);
 CREATE TABLE ad507.ad507_agent_permissions(organization_id uuid,product_id uuid,agent_id uuid,status text);
 CREATE TABLE ad507.ad507_sessions(session_id uuid PRIMARY KEY,organization_id uuid,product_id uuid,agent_id uuid,status text,channel text,metadata jsonb,started_at timestamptz DEFAULT now(),ended_at timestamptz,updated_at timestamptz DEFAULT now());
 CREATE TABLE ad507.ad507_controlled_conversations(session_id uuid PRIMARY KEY,user_id text,organization_id uuid,product_id uuid,agent_id uuid,permission text,status text,authorized boolean,revoked boolean,max_user_messages integer,claimed_messages integer DEFAULT 0,completed_responses integer DEFAULT 0,in_flight boolean DEFAULT false,completed_at timestamptz);
 CREATE TABLE ad507.ad507_memory(memory_key text,content text,priority integer,source text,organization_id uuid,product_id uuid,agent_id uuid,session_id uuid,memory_scope text,memory_type text,metadata jsonb,expires_at timestamptz);
 CREATE TABLE ad507.ad507_messages(message_id uuid PRIMARY KEY,session_id uuid,role text,content text,provider text,model text,metadata jsonb,organization_id uuid,product_id uuid,agent_id uuid,created_at timestamptz DEFAULT now());`);
 await db.unsafe("INSERT INTO ad507.ad507_organizations VALUES($1,'ad507')",[org]);
 await db.unsafe("INSERT INTO ad507.ad507_products VALUES($1,$2,'direcciones507')",[product,org]);
 await db.unsafe("INSERT INTO ad507.ad507_agents VALUES($1,$2,$3,'natalie','draft')",[agent,org,product]);
 for(let i=0;i<10;i++)await db.unsafe("INSERT INTO ad507.ad507_memory(memory_key,content,priority,source,organization_id,product_id,agent_id,memory_scope,memory_type,metadata) VALUES($1,'AD507 es una dirección digital.',10,'official_ad507_knowledge_v1',$2,$3,$4,'agent','knowledge',$5::jsonb)",['fixture-'+i,org,product,agent,JSON.stringify({authority:'official',version:'1.0',shared:false,session_scoped:false})]);
 const key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
 const result=Bun.spawnSync(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1']);
 if(result.exitCode!==0)throw Error('FIXTURE_CERTIFICATE_FAILED');
 runtime=Bun.spawn([process.execPath,'tests/fixtures/natalie-runtime.ts',cert,key],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,DATABASE_URL:database,AD507_TEST_NATALIE_FIXTURE:'true',AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true',OPENAI_API_KEY:'isolated-provider',AD507_OPENAI_MODEL:'gpt-5.6-luna',AD507_REASONING_EFFORT:'none',AD507_OPENAI_MAX_OUTPUT_TOKENS:'160',AD507_OPENAI_MAX_ESTIMATED_COST_USD:'0.0017'},stdout:'pipe',stderr:'pipe'});
 const reader=(runtime.stdout as ReadableStream<Uint8Array>).getReader();let text='';
 try{while(true){const r=await reader.read();if(r.done)throw Error('FIXTURE_START_FAILED');text+=new TextDecoder().decode(r.value);const m=text.match(/FIXTURE_PORT=(\d+)/);if(m){base='https://127.0.0.1:'+m[1];break;}}}finally{reader.releaseLock();}
},30000);
afterAll(async()=>{runtime?.kill();if(runtime)await runtime.exited;await db?.end({timeout:2});rmSync(dir,{recursive:true,force:true});});
function call(path:string,origin=pa,body:any={},session?:string){return fetch(base+path,{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'127.0.0.'+(origin===pa?'1':'2'),...(session?{'x-ad507-controlled-user':'ad507-controlled-user-001','x-ad507-session-id':session}:{})},body:JSON.stringify(body),tls:{rejectUnauthorized:false}});}
async function session(origin=pa){const r=await call('/internal/v1/natalie/controlled-session',origin);expect(r.status).toBe(200);expect(r.headers.get('access-control-allow-origin')).toBe(origin);return (await r.json()).session_id;}
const query=(text='¿Qué es AD507?')=>({organization_key:'ad507',product_key:'direcciones507',agent_key:'natalie',query:text});
test('COUNT int8 reproduces the exact 403 cause and read-only diagnosis identifies it',async()=>{
 const r=(await db.unsafe('SELECT count(*) AS original,count(*)::int AS corrected FROM ad507.ad507_agent_permissions'))[0];expect(r.original).toBe('0');expect(r.original!==0).toBe(true);expect(r.corrected).toBe(0);
 const d=await diagnoseNatalie(db,{OPENAI_API_KEY:'isolated-provider',AD507_INTERNATIONAL_DOMAIN_VERIFIED:'true'});expect(d.reasons).toEqual(['COUNT_INT8_STRING_STRICT_COMPARISON']);expect(d.correctedScopeReady).toBe(true);expect(d.officialKnowledgeCount).toBe(10);
});
test('same Natalie HTTPS handlers create sessions and complete three turns for PA and LATAM',async()=>{
 for(const origin of [pa,lat]){
  const sid=await session(origin);
  for(let i=1;i<=3;i++){const r=await call('/internal/v1/natalie/controlled-conversation',origin,query(),sid);expect(r.status).toBe(200);const d=await r.json();expect(d.ok).toBe(true);expect(d.response).toContain('AD507');expect(d.message_number).toBe(i);expect(d.status).toBe(i===3?'completed':'active');}
  expect((await call('/internal/v1/natalie/controlled-conversation',origin,query(),sid)).status).toBe(403);
  expect((await db.unsafe('SELECT count(*)::int AS n FROM ad507.ad507_messages WHERE session_id=$1',[sid]))[0].n).toBe(6);
 }
});
test('HTTPS concurrency claims exactly one turn; failed provider consumes the session safely',async()=>{
 const sid=await session(),responses=await Promise.all([call('/internal/v1/natalie/controlled-conversation',pa,query(),sid),call('/internal/v1/natalie/controlled-conversation',pa,query(),sid)]);expect(responses.map(r=>r.status).sort()).toEqual([200,403]);
 expect((await db.unsafe('SELECT claimed_messages,completed_responses,in_flight FROM ad507.ad507_controlled_conversations WHERE session_id=$1',[sid]))[0]).toMatchObject({claimed_messages:1,completed_responses:1,in_flight:false});
 const failed=await session();expect((await call('/internal/v1/natalie/controlled-conversation',pa,query('AD507 fallo proveedor'),failed)).status).toBe(502);
 expect((await db.unsafe('SELECT status,in_flight FROM ad507.ad507_controlled_conversations WHERE session_id=$1',[failed]))[0]).toMatchObject({status:'consumed_failed',in_flight:false});
 expect((await call('/internal/v1/natalie/controlled-conversation',pa,query(),failed)).status).toBe(403);
});
test('HTTPS origin, scope, permission and override guards remain closed',async()=>{
 expect((await call('/internal/v1/natalie/controlled-session','https://direcciones.lat.evil.test')).status).toBe(403);
 expect((await call('/internal/v1/natalie/controlled-session',pa,{agent_key:'other'})).status).toBe(403);
 await db.unsafe("INSERT INTO ad507.ad507_agent_permissions VALUES($1,$2,$3,'active')",[org,product,agent]);
 expect((await call('/internal/v1/natalie/controlled-session',pa)).status).toBe(403);
 await db.unsafe('DELETE FROM ad507.ad507_agent_permissions WHERE agent_id=$1',[agent]);
 await db.unsafe("UPDATE ad507.ad507_agents SET status='active' WHERE agent_id=$1",[agent]);expect((await call('/internal/v1/natalie/controlled-session',pa)).status).toBe(403);
 await db.unsafe("UPDATE ad507.ad507_agents SET status='draft' WHERE agent_id=$1",[agent]);
 const sid=await session();expect((await call('/internal/v1/natalie/controlled-conversation',pa,{...query(),tools:[]},sid)).status).toBe(403);
});
