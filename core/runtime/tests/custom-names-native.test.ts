import {test} from 'bun:test';
import postgres from 'postgres';
import {runCustomNamesIntegration} from '../scripts/custom-names-integration';
const database=process.env.AD507_TEST_DATABASE_URL;
test.skipIf(!database)('native isolated PostgreSQL: custom names, paid publication, canonical QR, transfer and simultaneous reservation',async()=>{
 const url=new URL(database!);if(!['127.0.0.1','localhost'].includes(url.hostname))throw Error('DISPOSABLE_LOCAL_DATABASE_REQUIRED');
 const control=postgres(url.href,{max:1}),name='names_'+crypto.randomUUID().replaceAll('-','');let sql:ReturnType<typeof postgres>|undefined;
 try{await control.unsafe('CREATE DATABASE '+name);url.pathname='/'+name;sql=postgres(url.href,{max:2});console.info(JSON.stringify(await runCustomNamesIntegration(sql)));}
 finally{await sql?.end({timeout:2});await control.unsafe('DROP DATABASE IF EXISTS '+name+' WITH (FORCE)');await control.end({timeout:2});}
},45000);
