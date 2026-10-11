import {test,expect} from 'bun:test';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {cpus,totalmem,loadavg} from 'node:os';
import {adminAddressPage} from '../admin-address-pagination';

const external=process.env.AD507_TEST_DATABASE_URL;
const percentile=(values:number[],p:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];

/** Uses only the existing disposable localhost CI Postgres. Never fall back to DATABASE_URL. */
test.skipIf(!external)('synthetic 1k/10k/100k real tables, paginated country reads and pool saturation bounds',async()=>{
 const u=new URL(external!);if(!['127.0.0.1','localhost'].includes(u.hostname))throw Error('TEST_DATABASE_MUST_BE_LOCAL');
 const name='latam_perf_'+crypto.randomUUID().replaceAll('-',''),root=new URL('../../../',import.meta.url);
 const control=postgres(external!,{max:1,connect_timeout:5});let db:ReturnType<typeof postgres>|undefined;
 try{
  await control.unsafe('CREATE DATABASE '+name);u.pathname='/'+name;
  db=postgres(u.toString(),{max:2,connect_timeout:5,application_name:'latam-synthetic-performance',connection:{statement_timeout:'5000',lock_timeout:'2000'}});
  const setup=await db.reserve();
  try{
   for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql'])await setup.unsafe(readFileSync(new URL('db/migrations/'+file,root),'utf8'));
   for(const file of ['landline.sql','requests.sql','countries.sql','scalability-indexes.sql'])await setup.unsafe(readFileSync(new URL('../schema-proposals/'+file,import.meta.url),'utf8'));
  }catch(error){await setup.unsafe('ROLLBACK');throw error;}finally{setup.release();}
  const started=performance.now(),results:any[]=[];let previous=0;
  for(const size of [1000,10000,100000]){
   const insertStart=performance.now();
   await db.unsafe(`INSERT INTO ad507.addresses(id,code,country_code,address_type,status,name,reference,description,latitude,longitude,source,created_at,updated_at,request_data)
     SELECT md5('latam-synthetic-'||g)::uuid,'AD'||CASE g%3 WHEN 0 THEN '507' WHEN 1 THEN '57' ELSE '506' END||'-SYNTHETIC'||g,
     CASE g%3 WHEN 0 THEN 'PA' WHEN 1 THEN 'CO' ELSE 'CR' END,CASE WHEN g%5=0 THEN 'PLACE' ELSE 'BUSINESS' END,CASE WHEN g%4=0 THEN 'PENDING_REVIEW' ELSE 'ACTIVE' END,
     'Synthetic business '||g,'Synthetic reference',repeat('x',512),8,-80,'USER_REQUEST',TIMESTAMPTZ '2026-01-01'+g*INTERVAL '1 microsecond',TIMESTAMPTZ '2026-01-01'+g*INTERVAL '1 microsecond','{}'::jsonb FROM generate_series($1::int,$2::int) g`,[previous+1,size]);
   const insertMs=performance.now()-insertStart;previous=size;await db.unsafe('ANALYZE ad507.addresses');
   const times:number[]=[],pointTimes:number[]=[];
   for(let i=0;i<40;i++){
    let t=performance.now();const page=await adminAddressPage(db,new URLSearchParams('country=PA'),'addresses');times.push(performance.now()-t);expect(page.items).toHaveLength(50);expect(page.nextCursor).not.toBeNull();
    t=performance.now();const row=await db.unsafe('SELECT id FROM ad507.addresses WHERE code=$1',['AD507-SYNTHETIC999']);pointTimes.push(performance.now()-t);expect(row).toHaveLength(1);
   }
   const first=await adminAddressPage(db,new URLSearchParams('country=PA&limit=100'),'addresses');
   const second=await adminAddressPage(db,new URLSearchParams('country=PA&limit=100&cursor='+first.nextCursor),'addresses');
   expect(new Set([...first.items,...second.items].map(r=>r.id)).size).toBe(200);
   expect([...first.items,...second.items].every(r=>r.countryCode==='PA')).toBe(true);
   for(const kind of ['requests','places'] as const){const p=await adminAddressPage(db,new URLSearchParams('country=CO'),kind);expect(p.items.every(r=>kind==='requests'?r.status==='PENDING_REVIEW':r.addressType==='PLACE')).toBe(true);}
   const bytes=(await db.unsafe("SELECT pg_total_relation_size('ad507.addresses')::float8 AS bytes,pg_indexes_size('ad507.addresses')::float8 AS indexes"))[0];
   const explain=(await db.unsafe("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM ad507.addresses WHERE country_code='PA' ORDER BY updated_at DESC,id DESC LIMIT 50"))[0]['QUERY PLAN'][0];
   results.push({size,insertMs,query:{p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99)},lookup:{p50:percentile(pointTimes,.5),p95:percentile(pointTimes,.95),p99:percentile(pointTimes,.99)},addressBytes:bytes.bytes,indexBytes:bytes.indexes,explain});
   if(percentile(times,.95)>500||performance.now()-started>30000)throw Error('PERFORMANCE_STOP_THRESHOLD');
  }
  const concurrent=[];
  for(const concurrency of [10,25,50]){
   const t=performance.now(),times:number[]=[];
   await Promise.all(Array.from({length:concurrency},async()=>{for(let n=0;n<3;n++){const at=performance.now();await adminAddressPage(db!,new URLSearchParams('country=PA'),'addresses');times.push(performance.now()-at);}}));
   const elapsed=performance.now()-t;concurrent.push({concurrency,queries:times.length,elapsedMs:elapsed,qps:times.length/(elapsed/1000),p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99)});
   if(percentile(times,.95)>1000||performance.now()-started>40000)throw Error('PERFORMANCE_STOP_THRESHOLD');
  }
  const connections=(await control.unsafe("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1",[name]))[0].count;expect(connections).toBeLessThanOrEqual(2);
  const last=results.at(-1);console.info('LATAM_PERFORMANCE '+JSON.stringify({environment:{cpu:cpus()[0]?.model,cpuCount:cpus().length,hostMemoryBytes:totalmem(),bunRssBytes:process.memoryUsage().rss,load:loadavg(),postgres:(await db.unsafe('SHOW server_version'))[0].server_version,poolMax:2,connections},results,concurrent,errors:0,projectionOnly:{millionAddressBytes:last.addressBytes*10,method:'10 × measured 100k relation size, synthetic 512-character descriptions; excludes media bytes, users, audit, orders, WAL, bloat and headroom'},httpCapacityVerified:false}));
 }finally{await db?.end({timeout:2});await control.unsafe('DROP DATABASE IF EXISTS '+name+' WITH (FORCE)');await control.end({timeout:2});}
},45000);
