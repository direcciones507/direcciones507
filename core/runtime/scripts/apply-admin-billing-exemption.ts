/** Explicit pre-deploy migration, never imported by server startup. No data updates. */
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
export async function applyAdminBillingExemption(sql:any){
 await sql.unsafe(readFileSync(new URL('../schema-proposals/admin-billing-exemption.sql',import.meta.url),'utf8'));
 const proof=await sql.unsafe("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='ad507' AND table_name='temporary_events' AND ((column_name='admin_published_by' AND data_type='uuid') OR (column_name='admin_published_at' AND data_type='timestamp with time zone'))");
 if(proof[0]?.n!==2)throw Error('ADMIN_BILLING_MIGRATION_UNVERIFIED');
}
if(import.meta.main){
 if(process.env.RAILWAY_PROJECT_ID!=='2b6d4e6c-e1d4-471d-a77d-c9bdb711650d'||process.env.RAILWAY_ENVIRONMENT_ID!=='909fdec4-8930-4405-ae53-6e8fb0d3f901'||process.env.RAILWAY_SERVICE_ID!=='b0da9f70-7790-4729-a728-aaa4aa3f571d')throw Error('WRONG_RELEASE_TARGET');
 const sql=postgres(process.env.DATABASE_URL!,{max:1,connect_timeout:10,onnotice:()=>{}});
 try{await applyAdminBillingExemption(sql);console.log('ADMIN_BILLING_MIGRATION_VERIFIED');}finally{await sql.end();}
}
