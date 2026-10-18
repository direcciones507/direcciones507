import {test,expect} from 'bun:test';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {createAnalyticsRepository,handleAnalyticsRoutes} from '../analytics-repository';
// CI-only integration: isolated schema/database, never production credentials.
const database=process.env.AD507_TEST_DATABASE_URL;
test.skipIf(!database)('persisted events, exact ownership, plans, repeat-safe SQL and concurrent deduplication',async()=>{
 if(!['127.0.0.1','localhost'].includes(new URL(database!).hostname))throw Error('LOCAL_DATABASE_REQUIRED');
 const admin=postgres(database!,{max:1}),name='analytics_'+crypto.randomUUID().replaceAll('-','');
 await admin.unsafe('CREATE DATABASE '+name);const url=new URL(database!);url.pathname='/'+name;
 let sql=postgres(url.href,{max:1});
 try{
 for(const file of ['0000_migration_ledger.sql','0001_core_foundation.sql','0002_plan_catalog.sql','0003_plan_capabilities.sql','0005_general_google_auth.sql'])await sql.unsafe(readFileSync(new URL('../../../db/migrations/'+file,import.meta.url),'utf8'));
 await sql.unsafe(`CREATE TABLE ad507.ad507_business_analytics_events(event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ad507_code text NOT NULL,event_type text NOT NULL CHECK(event_type IN ('google','waze','uber','share','copy','aviso')),occurred_at timestamptz NOT NULL DEFAULT now(),source text NOT NULL DEFAULT 'direcciones507_web' CHECK(source='direcciones507_web'),idempotency_key uuid); CREATE UNIQUE INDEX test_idempotency ON ad507.ad507_business_analytics_events(idempotency_key) WHERE idempotency_key IS NOT NULL`);
 await sql.unsafe('ALTER TABLE ad507.addresses ADD COLUMN publication_receipt text');
 await sql.unsafe("INSERT INTO ad507.ad507_business_analytics_events(ad507_code,event_type) VALUES('AD507-OLD','aviso')");
 const migration=readFileSync(new URL('../schema-proposals/analytics-visits.sql',import.meta.url),'utf8');await sql.unsafe(migration);await sql.unsafe(migration);
 await sql.end();sql=postgres(url.href,{max:3});
 const owner=crypto.randomUUID(),other=crypto.randomUUID();await sql.unsafe("INSERT INTO ad507.users(id,email) VALUES($1,'owner@example.test'),($2,'other@example.test')",[owner,other]);
 await sql.unsafe("INSERT INTO ad507.plans(code,name,status) VALUES('PLACE','Lugar Gratis','ACTIVE')");
 await sql.unsafe("INSERT INTO ad507.user_roles(user_id,role) VALUES($1,'CLIENT')",[owner]);
 const ids:string[]=[];
 const repo=createAnalyticsRepository(sql),session='a'.repeat(43);
 for(const plan of ['BUSINESS_FREE','PLACE','BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO']){
 const id=crypto.randomUUID(),code='AD507-STATS-'+plan;
 await sql.unsafe(`INSERT INTO ad507.addresses(id,code,address_type,status,name,source,publication_receipt,plan_id) SELECT $1,$2,$3,'ACTIVE','Statistics fixture','USER_REQUEST','isolated-receipt',id FROM ad507.plans WHERE code=$4`,[id,code,plan==='PLACE'?'PLACE':'BUSINESS',plan]);
 if(plan==='PLACE')await sql.unsafe('UPDATE ad507.addresses SET plan_id=NULL WHERE id=$1',[id]);
 await sql.unsafe("INSERT INTO ad507.address_ownership(address_id,user_id,ownership_role) VALUES($1,$2,'OWNER')",[id,owner]);
 expect((await repo.summary(owner,code)).visits.status).toBe('no_data');expect(()=>repo.summary(other,code)).toThrow('NOT_FOUND');
 const results=await Promise.all(Array.from({length:6},()=>repo.track(code,'visit',session)));expect(results.filter(r=>!r.duplicate)).toHaveLength(1);
 await repo.track(code,'google',session);await repo.track(code,'qr',session);
 const summary=await repo.summary(owner,code);expect(summary.visits).toEqual({status:'available',total:1});
 if(['BUSINESS_FREE','PLACE'].includes(plan)){expect(summary.interactions).toBeUndefined();expect(summary.daily_series).toBeUndefined();}else{expect(summary.interactions).toEqual({google:1,qr:1});if(plan==='BUSINESS_PREMIUM_PRO')expect(summary.daily_series).toHaveLength(3);else expect(summary.daily_series).toBeUndefined();}
 const approvedBody={source:'core_public_card',code,event:'share',session,consent:true};
 const good=await handleAnalyticsRoutes(new Request('http://direcciones.lat/internal/v1/analytics/track',{method:'POST',headers:{origin:'https://direcciones.lat','x-forwarded-proto':'https'},body:JSON.stringify(approvedBody)}),{sql,auth:{currentUser:async()=>null}});expect(good?.status).toBe(202);
 const bad=await handleAnalyticsRoutes(new Request('https://direcciones.lat/internal/v1/analytics/track',{method:'POST',headers:{origin:'https://evil.example'},body:JSON.stringify(approvedBody)}),{sql,auth:{currentUser:async()=>null}});expect(bad?.status).toBe(403);
 const auth={currentUser:async()=>({id:other})};expect((await handleAnalyticsRoutes(new Request('https://direcciones.lat/v1/user/analytics/'+code),{sql,auth}))?.status).toBe(404);
 ids.push(id);
 // Only Pro may expand the window; free/place and Premium keep their existing 30 days.
 await sql.unsafe("INSERT INTO ad507.ad507_business_analytics_events(ad507_code,event_type,occurred_at) VALUES($1,'call',now()-interval '45 days')",[code]);
 const long=await repo.summary(owner,code,90);expect(long.interactions?.call).toBe(plan==='BUSINESS_PREMIUM_PRO'?1:undefined);
 if(plan==='BUSINESS_PREMIUM_PRO'){expect(long.period_days).toBe(90);expect((await repo.summary(owner,code,7)).interactions?.call).toBeUndefined();}
 }
 if(process.env.AD507_ANALYTICS_BROWSER==='true')await (await import('../scripts/analytics-isolated-browser')).runAnalyticsBrowser(sql);
 for(const id of ids){const row=await sql.unsafe('SELECT code FROM ad507.addresses WHERE id=$1',[id]);await sql.unsafe('DELETE FROM ad507.address_ownership WHERE address_id=$1',[id]);expect(()=>repo.summary(owner,row[0].code)).toThrow('NOT_FOUND');}
 const auth={currentUser:async()=>null};expect((await handleAnalyticsRoutes(new Request('https://direcciones.lat/v1/user/analytics/AD507-TEST'),{sql,auth}))?.status).toBe(401);
 const body={source:'core_public_card',code:'AD507-TEST',event:'visit',session,consent:false};expect((await handleAnalyticsRoutes(new Request('https://direcciones.lat/internal/v1/analytics/track',{method:'POST',headers:{origin:'https://direcciones.lat'},body:JSON.stringify(body)}),{sql,auth}))?.status).toBe(400);
 expect(await handleAnalyticsRoutes(new Request('https://direcciones507.com/internal/v1/analytics/track',{method:'POST',body:JSON.stringify({code:'AD507-OLD',event:'google'})}),{sql,auth})).toBeNull();
 expect((await sql.unsafe("SELECT count(*)::int AS n FROM ad507.ad507_business_analytics_events WHERE ad507_code='AD507-OLD'"))[0].n).toBe(1);
 }finally{await sql.end();await admin.unsafe('DROP DATABASE '+name+' WITH (FORCE)');await admin.end();}
},180000);
