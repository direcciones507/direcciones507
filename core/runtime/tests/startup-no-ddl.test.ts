import {test,expect} from 'bun:test';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:net';

test('real Core startup succeeds in a read-only PostgreSQL database and preserves its schema',async()=>{
 const external=process.env.AD507_TEST_DATABASE_URL;
 if(!external||!['localhost','127.0.0.1'].includes(new URL(external).hostname))throw Error('LOCAL_TEST_DATABASE_REQUIRED');
 const admin=postgres(external,{max:1,connect_timeout:5}),name='pr43_boot_'+crypto.randomUUID().replaceAll('-','');
 let runtime:ReturnType<typeof Bun.spawn>|undefined,db:ReturnType<typeof postgres>|undefined;
 try{
  await admin.unsafe('CREATE DATABASE '+name);
  const url=new URL(external);url.pathname='/'+name;
  db=postgres(url.href,{max:1,connect_timeout:5});
  for(const f of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await db.unsafe(readFileSync(new URL('../../../db/migrations/'+f,import.meta.url),'utf8'));
  const fingerprint=async()=>JSON.stringify(await db!.unsafe("SELECT c.relname,c.relkind,a.attname,a.atttypid,a.attnotnull FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE n.nspname='ad507' ORDER BY c.relname,a.attnum"));
  await db.unsafe("CREATE TABLE ad507.ad507_residential_pin_credentials (residential_code text,authorized_payload jsonb)");
  await db.unsafe(`INSERT INTO ad507.ad507_residential_pin_credentials VALUES('AD507-PRESERVE','{"codigo":"ad507-original"}'::jsonb)`);
  const historicalBefore=JSON.stringify(await db.unsafe('SELECT * FROM ad507.ad507_residential_pin_credentials'));
  const before=await fingerprint();console.info('BOOT_CHECK schema prepared');
  await admin.unsafe('ALTER DATABASE '+name+' SET default_transaction_read_only=on');
  await db.end({timeout:2});db=postgres(url.href,{max:1,connect_timeout:5});
  console.info('BOOT_CHECK readonly connection');expect((await db.unsafe('SHOW transaction_read_only'))[0].transaction_read_only).toBe('on');
  // This must reject even IF NOT EXISTS: otherwise startup would not be protected by this test.
  let denied=false;try{await db.unsafe('CREATE TABLE IF NOT EXISTS ad507.users (id uuid)');}catch(e:any){denied=e.code==='25006';}expect(denied).toBe(true);console.info('BOOT_CHECK DDL denied');
  const port=await new Promise<number>((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=(s.address() as {port:number}).port;s.close(e=>e?reject(e):resolve(p));});});
  console.info('BOOT_CHECK launch');runtime=Bun.spawn([process.execPath,'server.ts'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,DATABASE_URL:url.href,PORT:String(port),AD507_GOOGLE_CLIENT_ID:'isolated',AD507_GOOGLE_CLIENT_SECRET:crypto.randomUUID(),AD507_SESSION_SECRET:crypto.randomUUID()+crypto.randomUUID(),AD507_GOOGLE_REDIRECT_URI:'https://ad507-core-production.up.railway.app/auth/google/callback',AD507_PUBLIC_BASE_URL:'https://ad507-core-production.up.railway.app',AD507_AUTH_SUCCESS_URL:'/'},stdout:'ignore',stderr:'pipe'});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}await Bun.sleep(50);}
  if(!ready)throw Error('STARTUP_FAILED: '+await new Response(runtime.stderr).text());
  expect((await fetch('http://127.0.0.1:'+port+'/ready')).status).toBe(200);
  expect(await fingerprint()).toBe(before);expect(JSON.stringify(await db.unsafe('SELECT * FROM ad507.ad507_residential_pin_credentials'))).toBe(historicalBefore);
 }finally{
  runtime?.kill();if(runtime)await runtime.exited;await db?.end({timeout:2});
  await admin.unsafe('DROP DATABASE IF EXISTS '+name);await admin.end({timeout:2});
 }
},30000);
