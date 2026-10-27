import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runCustomNamesIntegration} from './custom-names-integration';
const directory=process.env.AD507_PGLITE_PACKAGE;if(!directory||!directory.startsWith('/')||directory.includes('://'))throw Error('EXPLICIT_LOCAL_PGLITE_PACKAGE_REQUIRED');
const {PGlite}=await import(pathToFileURL(resolve(directory,'dist/index.js')).href);
const {pgcrypto}=await import(pathToFileURL(resolve(directory,'dist/contrib/pgcrypto.js')).href);
const db=await PGlite.create({extensions:{pgcrypto}});await db.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto');
const param=(v:any)=>v instanceof Date?v.toISOString():Array.isArray(v)?'{'+v.map(x=>'"'+String(x).replaceAll('"','\\"')+'"').join(',')+'}':v&&typeof v==='object'?JSON.stringify(v):v;
function adapter(db:any){
 const sql:any=async(strings:TemplateStringsArray,...args:any[])=>sql.unsafe(strings.reduce((s,v,i)=>s+v+(i<args.length?'$'+(i+1):''),''),args);
 sql.unsafe=async(q:string,args:any[]=[])=>args.length?(await db.query(q,args.map(param))).rows:(await db.exec(q)).at(-1)?.rows??[];
 sql.json=(v:any)=>JSON.stringify(v);sql.begin=(fn:any)=>db.transaction((tx:any)=>fn(adapter(tx)));sql.reserve=async()=>sql;sql.release=()=>{};return sql;
}
try{console.log(JSON.stringify({engine:'PostgreSQL WASM, single backend; NOT native multi-connection',...await runCustomNamesIntegration(adapter(db))},null,2))}finally{await db.close()}
