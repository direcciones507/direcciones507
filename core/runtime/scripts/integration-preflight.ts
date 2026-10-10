import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import { normalizeAd507Code } from '../../postgres/public-address-repository';

const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const required=['users','user_roles','plans','plan_capabilities','addresses','address_ownership','address_media','address_socials','audit_log','schema_migrations','auth_sessions','google_identities','oauth_transactions'];

/** Operator-only read audit; no routes, allocator, publisher or startup side effects. */
export async function inspectCanonicalSchema(sql:Sql) {
  return sql.begin('isolation level repeatable read read only',async tx=>{
    await tx.unsafe("SET LOCAL statement_timeout='10s'");
    await tx.unsafe("SET LOCAL lock_timeout='2s'");
    const columns=await tx.unsafe("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='ad507' ORDER BY table_name,ordinal_position");
    const constraints=await tx.unsafe("SELECT c.conname AS name,t.relname AS relation,c.contype AS type,c.convalidated AS validated,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='ad507' ORDER BY t.relname,c.conname");
    const indexes=await tx.unsafe("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='ad507' ORDER BY tablename,indexname");
    const tables=new Set(columns.map(c=>c.table_name));
    const ledger=tables.has('schema_migrations')?await tx.unsafe('SELECT version,checksum_sha256 FROM ad507.schema_migrations ORDER BY version'):[];
    const hasCode=columns.some(c=>c.table_name==='addresses'&&c.column_name==='code');
    const codes=hasCode?(await tx.unsafe(`SELECT count(*)::int AS total,count(*) FILTER(WHERE code IS NULL)::int AS uncoded,
      count(*) FILTER(WHERE code IS NOT NULL AND (code<>upper(btrim(code)) OR code!~'^AD507-[A-Z0-9_-]+$'))::int AS noncanonical,
      (SELECT count(*)::int FROM (SELECT upper(btrim(code)) FROM ad507.addresses WHERE code IS NOT NULL GROUP BY upper(btrim(code)) HAVING count(*)>1) d) AS normalized_duplicates FROM ad507.addresses`))[0]:null;
    const expectedColumns=['landline_phone','request_key_hash','request_payload_hash','request_data','review_decision','reviewed_by','publication_receipt'];
    const missingRequestColumns=expectedColumns.filter(name=>!columns.some(c=>c.table_name==='addresses'&&c.column_name===name));
    if(!columns.some(c=>c.table_name==='address_media'&&c.column_name==='upload_status'))missingRequestColumns.push('address_media.upload_status');
    const schema={columns:Array.from(columns),constraints:Array.from(constraints),indexes:Array.from(indexes),ledger:Array.from(ledger)};
    return {readOnly:true,missingTables:required.filter(t=>!tables.has(t)),missingRequestColumns,codes,...schema,schemaFingerprint:sha(JSON.stringify(schema)),allocationVerified:false,publicationVerified:false};
  });
}

/** Shares the existing code normalizer; never interprets gaps as available codes. */
export function inspectHistoricalCodes(values:unknown[]) {
  const codes:string[]=[];let invalid=0,noncanonical=0;
  for(const item of values){
    const raw=typeof item==='string'?item:typeof item==='object'&&item!==null?(item as {codigo?:unknown}).codigo:undefined;
    if(typeof raw!=='string'){invalid++;continue;}
    const normalized=normalizeAd507Code(raw);if(!normalized){invalid++;continue;}
    if(raw!==normalized)noncanonical++;codes.push(normalized);
  }
  const unique=[...new Set(codes)].sort();
  const numeric=unique.filter(c=>/^AD507-\d+$/.test(c)).map(c=>Number(c.slice(6)));
  return {count:values.length,valid:codes.length,duplicates:codes.length-unique.length,invalid,noncanonical,
    highestNumeric:numeric.length?Math.max(...numeric):null,registryFingerprint:sha(JSON.stringify(unique)),allocationVerified:false as const};
}

export function publicationSources(root=new URL('../../../',import.meta.url)) {
  return ['index.html','.github/workflows/auto-sync-ad507.yml','.github/workflows/generate.yml'].map(path=>{
    const source=readFileSync(new URL(path,root),'utf8');
    const urls=[...new Set(source.match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g)??[])];
    if(urls.length!==1)throw Error('PUBLICATION_SOURCE_AMBIGUOUS');return {path,url:urls[0]};
  });
}

export async function inspectPublicationSources(http:typeof fetch=fetch) {
  const sources=publicationSources();
  const results=await Promise.all([...new Set(sources.map(s=>s.url))].map(async url=>{
    try{
      const response=await http(url+'?action=list',{method:'GET',redirect:'follow',signal:AbortSignal.timeout(15000)});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('SOURCE_UNAVAILABLE');
      const reader=response.body?.getReader();if(!reader)throw Error('SOURCE_UNAVAILABLE');
      const chunks:Uint8Array[]=[];let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256000){await reader.cancel();throw Error('SOURCE_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
      const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!Array.isArray(payload.codes)||payload.codes.length>10000)throw Error('SOURCE_INVALID');
      return {url,ok:true,...inspectHistoricalCodes(payload.codes)};
    }catch{return {url,ok:false,error:'SOURCE_NOT_VERIFIED'};}
  }));
  return {sources,results,sameRegistry:results.every(r=>r.ok)&&new Set(results.map(r=>'registryFingerprint'in r?r.registryFingerprint:null)).size===1,allocationVerified:false,publicationVerified:false};
}

if(import.meta.main){
  const mode=process.argv[2];
  if(mode==='sources')console.log(JSON.stringify(await inspectPublicationSources(),null,2));
  else if(mode==='postgres'){
    // Dedicated read-only connection; never echo connection strings or SQL errors.
    const url=process.env.AD507_AUDIT_DATABASE_URL;
    if(!url){console.error('AD507_AUDIT_DATABASE_URL_REQUIRED');process.exit(1);}
    const sql=postgres(url,{max:1,connect_timeout:10,application_name:'ad507-read-only-preflight'});
    try{console.log(JSON.stringify(await inspectCanonicalSchema(sql),null,2));}
    catch{console.error('SCHEMA_NOT_VERIFIED');process.exitCode=1;}
    finally{await sql.end({timeout:2});}
  }else{console.error('MODE_REQUIRED: sources | postgres');process.exitCode=1;}
}
