/** One-shot operator job. Never imported by the web server. No public endpoint. */
import postgres from 'postgres';
import {createHash,randomBytes,createCipheriv,createDecipheriv,scryptSync} from 'node:crypto';
import {mkdtemp,readFile,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {signedR2Request} from '../r2-signing';
import {r2Settings} from '../r2-storage';
import {createTemporaryEventMedia} from '../temporary-event-media';
import {optimizeRequestImage} from '../image-processing';
import {prepareTemporaryEvents} from './prepare-temporary-events';
import sharp from 'sharp';
import {yappyConfiguration} from '../payment-policy';
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
export function sealBackup(bytes:Uint8Array,secret:string){
 if(!/^[a-f0-9]{64}$/.test(secret))throw Error('INVALID_BACKUP_KEY');
 const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(secret,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
 return Buffer.concat([Buffer.from('AD507BK1'),salt,iv,cipher.getAuthTag(),encrypted]);
}
export function openBackup(bytes:Uint8Array,secret:string){
 const b=Buffer.from(bytes);if(b.subarray(0,8).toString()!=='AD507BK1')throw Error('INVALID_BACKUP_ARCHIVE');
 const cipher=createDecipheriv('aes-256-gcm',scryptSync(secret,b.subarray(8,24),32),b.subarray(24,36));cipher.setAuthTag(b.subarray(36,52));return Buffer.concat([cipher.update(b.subarray(52)),cipher.final()]);
}
const ident=(x:string)=>'"'+x.replaceAll('"','""')+'"';
export async function inventory(sql:any,tables?:{schema:string;name:string}[]){
 const list=tables??await sql.unsafe(`SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%' ORDER BY n.nspname,c.relname`);
 const result=[];
 for(const t of list){const rows=await sql.unsafe(`SELECT count(*)::text AS rows,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS h FROM ${ident(t.schema)}.${ident(t.name)} t) x`);result.push({schema:t.schema,name:t.name,rows:rows[0].rows,digest:rows[0].digest})}
 return result;
}
function pgEnv(url:URL){return {PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')||'prefer',PGOPTIONS:'-c timezone=UTC -c lock_timeout=5000',PATH:process.env.PATH};}
async function command(args:string[],env:Record<string,string|undefined>){
 const p=Bun.spawn(args,{env,stdout:'pipe',stderr:'pipe'});const [out,err,code]=await Promise.all([new Response(p.stdout).text(),new Response(p.stderr).text(),p.exited]);
 if(code!==0){const reason=err.split('\n').find(x=>/ERROR:|error:/.test(x))?.replace(/"[^"]*"|'[^']*'/g,'[redacted]').slice(0,220);throw Error('TOOL_FAILED_'+args[0]+': '+(reason||'exit '+code))}return out;
}
export async function runRelease(env:Record<string,string|undefined>){
 if(env.RAILWAY_PROJECT_ID!=='2b6d4e6c-e1d4-471d-a77d-c9bdb711650d'||env.RAILWAY_ENVIRONMENT_ID!=='909fdec4-8930-4405-ae53-6e8fb0d3f901'||!['temporary-events-225','temporary-price-1299'].includes(env.AD507_RELEASE_AUTHORIZED||''))throw Error('WRONG_RELEASE_TARGET');
 const priceRelease=env.AD507_RELEASE_AUTHORIZED==='temporary-price-1299';
 if(priceRelease&&!['price-backup','price-apply'].includes(env.AD507_RELEASE_MODE||''))throw Error('INVALID_PRICE_RELEASE_MODE');
 const target=new URL(env.DATABASE_URL||'');if(!target.hostname.endsWith('.railway.internal')||decodeURIComponent(target.pathname.slice(1))!=='railway')throw Error('DATABASE_IDENTITY_NOT_VERIFIED');
 if(!/^[a-f0-9]{40}$/.test(env.AD507_RELEASE_COMMIT||''))throw Error('INVALID_RELEASE_COMMIT');
 const settings=r2Settings(env);if(!settings)throw Error('R2_NOT_VERIFIED');
 const secret=env.AD507_TEMPORARY_BACKUP_KEY||'';if(!/^[a-f0-9]{64}$/.test(secret))throw Error('INVALID_BACKUP_KEY');
 if(env.AD507_RELEASE_MODE==='acceptance')return (await import('./temporary-event-live-acceptance')).liveAcceptance(env,settings);
 const sql=postgres(target.href,{max:2,connect_timeout:10,connection:{application_name:'temporary-events-release-225',timezone:'UTC',statement_timeout:120000,lock_timeout:5000},onnotice:()=>{}});
 const work=await mkdtemp(join(tmpdir(),'ad507-release-'));
 const prefix='release-backups/temporary-events/'+new Date().toISOString().replace(/[^0-9TZ]/g,'');
 const report:any={projectId:env.RAILWAY_PROJECT_ID,environmentId:env.RAILWAY_ENVIRONMENT_ID,commit:env.AD507_RELEASE_COMMIT,backupPrefix:prefix};
 let local:ReturnType<typeof postgres>|undefined,restore:ReturnType<typeof Bun.spawn>|undefined;
 const log=(phase:string,info:unknown={})=>console.log('TEMPORARY_RELEASE '+JSON.stringify({phase,...info as any}));
 const transfer=async(method:'PUT'|'GET',key:string,bytes:Uint8Array=new Uint8Array())=>{const signed=signedR2Request(settings,method,key,bytes,'application/octet-stream');const r=await fetch(signed.url,{method,headers:signed.headers,...(method==='PUT'?{body:Buffer.from(bytes)}:{}),redirect:'error',signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('PRIVATE_R2_BACKUP_'+method+'_HTTP_'+r.status);return method==='GET'?Buffer.from(await r.arrayBuffer()):null};
 const persist=async(name:string,plain:Uint8Array)=>{const key=prefix+'/'+name+'.enc',encrypted=sealBackup(plain,secret);await transfer('PUT',key,encrypted);const downloaded=await transfer('GET',key);if(sha(downloaded!)!==sha(encrypted))throw Error('BACKUP_DOWNLOAD_MISMATCH');const restored=openBackup(downloaded!,secret);if(sha(restored)!==sha(plain))throw Error('BACKUP_DECRYPT_MISMATCH');return {key,bytes:plain.length,sha256:sha(plain),restored};};
 try{
  const identity=(await sql.unsafe('SELECT current_database() AS database,current_user AS username,version() AS version'))[0];
  if(identity.database!=='railway')throw Error('WRONG_DATABASE');
  const foundation=await sql.unsafe("SELECT data_type FROM information_schema.columns WHERE table_schema='ad507' AND table_name='users' AND column_name='id'");if(foundation[0]?.data_type!=='uuid')throw Error('AUTH_FOUNDATION_REQUIRED');
  const existing=await sql.unsafe("SELECT tablename FROM pg_tables WHERE schemaname='ad507' AND tablename IN ('temporary_events','temporary_event_media','temporary_event_orders')");if(priceRelease?existing.length!==3:existing.length!==0)throw Error('EVENT_SCHEMA_NOT_EXPECTED');
  log('IDENTIFIED',{database:identity.database,postgresVersion:String(identity.version).split(' on ')[0]});
  const file=join(work,'database.dump');let baseline:any[]=[];
  await sql.begin('isolation level repeatable read read only',async tx=>{
   baseline=await inventory(tx);const snapshot=(await tx.unsafe('SELECT pg_export_snapshot() AS id'))[0].id;
   await command(['pg_dump','--format=custom','--compress=6','--no-password','--snapshot='+snapshot,'--file='+file],pgEnv(target));
  });
  const size=(await stat(file)).size;if(size<32||size>512*1024*1024)throw Error('BACKUP_SIZE_REQUIRES_STREAMING_REVIEW');
  const dump=await readFile(file);const backup=await persist('database.dump',dump);report.backup={key:backup.key,bytes:backup.bytes,sha256:backup.sha256};
  const globalsFile=join(work,'globals.sql');await command(['pg_dumpall','--globals-only','--no-password','--file='+globalsFile],pgEnv(target));
  const globals=await persist('globals.sql',await readFile(globalsFile));report.globals={key:globals.key,sha256:globals.sha256};
  await persist('inventory.json',Buffer.from(JSON.stringify(baseline)));
  const downloadedFile=join(work,'downloaded.dump');await writeFile(downloadedFile,backup.restored,{mode:0o600});await command(['pg_restore','--list',downloadedFile],{PATH:env.PATH});log('BACKUP_STORED',{...report.backup,tableCount:baseline.length});
  const cluster=join(work,'restore');await command(['initdb','-D',cluster,'-U','postgres','-A','trust'],{PATH:env.PATH});
  restore=Bun.spawn(['postgres','-D',cluster,'-h','127.0.0.1','-p','55440','-k',''],{env:{PATH:env.PATH},stdout:'ignore',stderr:'ignore'});
  const localUrl=new URL('postgres://postgres@127.0.0.1:55440/postgres');
  let ready=false;for(let i=0;i<100;i++){try{await command(['pg_isready','-h','127.0.0.1','-p','55440','-U','postgres'],{PATH:env.PATH});ready=true;break}catch{await Bun.sleep(200)}}if(!ready)throw Error('RESTORE_CLUSTER_FAILED');
  local=postgres(localUrl.href,{max:1,connection:{timezone:'UTC'},onnotice:()=>{}});
  const roles=await sql.unsafe("SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname<>'postgres'");for(const r of roles)await local.unsafe('CREATE ROLE '+ident(r.rolname));
  await local.unsafe('CREATE DATABASE restore_verification');await local.end();localUrl.pathname='/restore_verification';
  await command(['pg_restore','--exit-on-error','--no-owner','--no-privileges','--dbname=restore_verification',downloadedFile],pgEnv(localUrl));
  local=postgres(localUrl.href,{max:1,connection:{timezone:'UTC'},onnotice:()=>{}});
  const restoredInventory=await inventory(local);if(JSON.stringify(restoredInventory)!==JSON.stringify(baseline))throw Error('RESTORED_DATA_INVENTORY_MISMATCH');
  report.restoreVerified=true;report.originalTables=baseline.length;report.originalRows=baseline.reduce((n,t)=>n+Number(t.rows),0);log('RESTORE_VERIFIED',{tables:report.originalTables,rows:report.originalRows});
  if(priceRelease){
   const defaults=await sql.unsafe("SELECT table_name,column_name,column_default FROM information_schema.columns WHERE table_schema='ad507' AND ((table_name='temporary_events' AND column_name='price_cents') OR (table_name='temporary_event_orders' AND column_name='amount_cents')) ORDER BY table_name");
   report.priceDefaultsBefore=defaults;
   const checkpoint=await persist('verified-price-backup-report.json',Buffer.from(JSON.stringify(report)));report.preMigrationReport=checkpoint.key;
   if(env.AD507_RELEASE_MODE==='price-backup'){log('PRICE_BACKUP_COMPLETE',report);return report;}
   const config=yappyConfiguration({...env,AD507_YAPPY_IPN_URL:env.AD507_TEMPORARY_YAPPY_IPN_URL});
   if(!config||config.environment!=='production'||config.ipnUrl!=='https://direcciones.lat/v1/payments/temporary-events/yappy/ipn')throw Error('YAPPY_PRODUCTION_CONFIGURATION_REQUIRED');
   const response=await fetch('https://apipagosbg.bgeneral.cloud/payments/validate/merchant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({merchantId:config.merchantId,urlDomain:config.domain}),redirect:'error',signal:AbortSignal.timeout(15000)});
   const merchant=await response.json() as any;
   if(!response.ok||typeof merchant.body?.token!=='string'||!merchant.body.token||!Number.isFinite(Number(merchant.body.epochTime)))throw Error('YAPPY_MERCHANT_VALIDATION_FAILED');
   report.yappy={environment:config.environment,domain:config.domain,merchantFingerprint:sha(config.merchantId).slice(0,12),validated:true,chargeCreated:false};log('YAPPY_MERCHANT_VERIFIED',report.yappy);
   const migration=await readFile(new URL('../schema-proposals/temporary-events-price-1299.sql',import.meta.url),'utf8');
   await sql.begin('isolation level repeatable read',async tx=>{
    const tables=baseline.filter(x=>!(x.schema==='ad507'&&x.name==='schema_migrations')).map(({schema,name})=>({schema,name}));
    const before=await inventory(tx,tables);
    const ledger=await tx.unsafe("SELECT checksum_sha256 FROM ad507.schema_migrations WHERE version='temporary-events-price-1299'");
    if(ledger.length&&ledger[0].checksum_sha256!==sha(migration))throw Error('PRICE_MIGRATION_CHECKSUM_CHANGED');
    await tx.unsafe(migration.replace(/\bBEGIN;/,'').replace(/COMMIT;\s*$/,''));
    const after=await inventory(tx,tables);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('EXISTING_DATA_CHANGED_ROLLBACK');
    await tx.unsafe("INSERT INTO ad507.schema_migrations(version,checksum_sha256,description,applied_by,metadata) VALUES('temporary-events-price-1299',$1,'Temporary 1299 defaults; retain original orders',current_user,$2::jsonb) ON CONFLICT(version) DO NOTHING",[sha(migration),JSON.stringify({commit:env.AD507_RELEASE_COMMIT,backup:report.backup.key})]);
    report.existingRowsUnchanged=true;
    report.priceDefaultsAfter=await tx.unsafe("SELECT table_name,column_name,column_default FROM information_schema.columns WHERE table_schema='ad507' AND ((table_name='temporary_events' AND column_name='price_cents') OR (table_name='temporary_event_orders' AND column_name='amount_cents')) ORDER BY table_name");
    if(report.priceDefaultsAfter.length!==2||report.priceDefaultsAfter.some((x:any)=>x.column_default!=='1299'))throw Error('PRICE_DEFAULTS_NOT_UPDATED');
   });
   report.migrationApplied=true;report.completedAt=new Date().toISOString();await persist('price-completed-report.json',Buffer.from(JSON.stringify(report)));log('PRICE_MIGRATION_VERIFIED',report);return report;
  }
  // Real image roundtrip through the unchanged event adapter before any live DDL.
  const media=createTemporaryEventMedia(settings),fixture=await sharp({create:{width:16,height:16,channels:3,background:'#1760ce'}}).png().toBuffer(),id=crypto.randomUUID();
  const uploaded=await media.upload(id,fixture,'image/png'),read=await media.read(uploaded.key),expected=await optimizeRequestImage(fixture,'image/png');if(sha(read)!==sha(expected.bytes))throw Error('EVENT_R2_ROUNDTRIP_MISMATCH');
  const del=signedR2Request(settings,'DELETE',uploaded.key,new Uint8Array(),'image/webp');const removed=await fetch(del.url,{method:'DELETE',headers:del.headers,redirect:'error'});if(!removed.ok)throw Error('R2_TEST_CLEANUP_FAILED');report.r2RoundtripVerified=true;log('R2_VERIFIED');
  // Verified archive is persisted BEFORE entering the only live write transaction.
  const checkpoint=await persist('verified-backup-report.json',Buffer.from(JSON.stringify(report)));report.preMigrationReport=checkpoint.key;
  if(env.AD507_RELEASE_MODE!=='apply'){log('BACKUP_ONLY_COMPLETE',report);return report;}
  const expectedUsers=Number(baseline.find(x=>x.schema==='ad507'&&x.name==='users')?.rows);if(!Number.isSafeInteger(expectedUsers))throw Error('BACKUP_USERS_MISSING');
  const migration=prepareTemporaryEvents(identity.database,expectedUsers,env.AD507_RELEASE_COMMIT!).replace(/\bBEGIN;/,'').replace(/COMMIT;\s*$/,'');
  await sql.begin('isolation level repeatable read',async tx=>{
   const originals=baseline.filter(x=>!(x.schema==='ad507'&&x.name==='schema_migrations')).map(({schema,name})=>({schema,name}));
   const before=await inventory(tx,originals);await tx.unsafe(migration);
   const after=await inventory(tx,originals);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('HISTORICAL_DATA_CHANGED_ROLLBACK');
   const tables=await tx.unsafe("SELECT tablename FROM pg_tables WHERE schemaname='ad507' AND tablename IN ('temporary_events','temporary_event_media','temporary_event_orders') ORDER BY tablename");if(tables.length!==3)throw Error('MIGRATION_INCOMPLETE_ROLLBACK');report.tables=tables.map(x=>x.tablename);report.historicalDataUnchanged=true;
  });
  report.migrationApplied=true;report.completedAt=new Date().toISOString();await persist('completed-report.json',Buffer.from(JSON.stringify(report)));log('MIGRATION_VERIFIED',report);return report;
 }finally{await local?.end({timeout:3});restore?.kill();if(restore)await restore.exited;await sql.end({timeout:3});}
}
if(import.meta.main){try{await runRelease(process.env)}catch(e){console.error('TEMPORARY_RELEASE_FAILED '+(e instanceof Error?e.message:'UNKNOWN').replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]'));process.exitCode=1;}}
