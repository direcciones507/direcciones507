import postgres, {type Sql} from 'postgres';

/** Operator-only: inspect the actual connected role, never credentials or customer rows. */
export async function inspectDatabaseSecurity(sql:Sql) {
 return sql.begin('isolation level repeatable read read only',async tx=>{
  await tx.unsafe("SET LOCAL statement_timeout='10s'");
  await tx.unsafe("SET LOCAL lock_timeout='2s'");
  const [mode]=await tx.unsafe("SELECT current_setting('transaction_read_only')='on' AS read_only");
  if(mode?.read_only!==true)throw Error('READ_ONLY_REQUIRED');
  const [role]=await tx.unsafe(`SELECT r.rolsuper AS superuser,r.rolcreaterole AS create_role,
   r.rolcreatedb AS create_database,r.rolreplication AS replication,r.rolbypassrls AS bypass_rls,
   EXISTS(SELECT 1 FROM pg_roles p WHERE p.oid<>r.oid AND pg_has_role(r.oid,p.oid,'MEMBER')
    AND (p.rolsuper OR p.rolcreaterole OR p.rolcreatedb OR p.rolreplication OR p.rolbypassrls
      OR p.rolname IN ('pg_read_all_data','pg_write_all_data','pg_read_server_files','pg_write_server_files','pg_execute_server_program'))) AS privileged_membership,
   has_schema_privilege(current_user,'public','CREATE') AS public_schema_create,
   has_database_privilege(current_user,current_database(),'CREATE') AS database_create
   FROM pg_roles r WHERE r.rolname=current_user`);
  if(!role)throw Error('ROLE_NOT_VERIFIED');
  const [schema]=await tx.unsafe(`SELECT
   EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname='ad507' AND has_schema_privilege(current_user,n.oid,'CREATE')) AS ad507_schema_create,
   (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('ad507','radar') AND c.relkind IN ('r','p') AND pg_has_role(current_user,c.relowner,'USAGE')) AS owned_or_effectively_owned_tables`);
  const [tls]=await tx.unsafe("SELECT ssl,version FROM pg_stat_ssl WHERE pid=pg_backend_pid()");
  if(!schema)throw Error('SCHEMA_NOT_VERIFIED');
  return {readOnly:true,
   role:{superuser:role.superuser,createRole:role.create_role,createDatabase:role.create_database,
    replication:role.replication,bypassRls:role.bypass_rls,privilegedMembership:role.privileged_membership,
    publicSchemaCreate:role.public_schema_create,databaseCreate:role.database_create,
    ad507SchemaCreate:schema.ad507_schema_create,ownedOrEffectivelyOwnedTables:schema.owned_or_effectively_owned_tables},
   connection:{encrypted:typeof tls?.ssl==='boolean'?tls.ssl:null,tlsVersion:typeof tls?.version==='string'?tls.version:null},
   scope:'CURRENT_CONNECTION_ONLY',networkIsolationVerified:false,backupVerified:false};
 });
}

/** Run once per service start, only when explicitly enabled. No HTTP routes or recurring timer. */
export async function runOptInDatabaseSecurityAudit(sql:Sql,env:Record<string,string|undefined>,write:(message:string)=>void=console.log){
 if(env.AD507_DATABASE_SECURITY_AUDIT_ENABLED!=='true')return;
 try{
  let endpoint:'PRIVATE_RAILWAY'|'PUBLIC_PROXY'|'OTHER'|'UNKNOWN'='UNKNOWN';
  try{
   const host=new URL(env.DATABASE_URL??'').hostname.toLowerCase();
   endpoint=host.endsWith('.railway.internal')?'PRIVATE_RAILWAY':host.endsWith('.proxy.rlwy.net')?'PUBLIC_PROXY':'OTHER';
  }catch{}
  const report=await inspectDatabaseSecurity(sql);
  write('AD507_DATABASE_SECURITY_AUDIT '+JSON.stringify({ok:true,endpoint,...report}));
 }catch{
  write('AD507_DATABASE_SECURITY_AUDIT '+JSON.stringify({ok:false,error:'DATABASE_SECURITY_NOT_VERIFIED'}));
 }
}

if(import.meta.main){
 const url=process.env.DATABASE_URL;
 if(!url){console.error('DATABASE_URL_REQUIRED');process.exitCode=1;}
 else{
  const sql=postgres(url,{max:1,connect_timeout:10,connection:{application_name:'ad507-security-audit'}});
  try{console.log(JSON.stringify({ok:true,...await inspectDatabaseSecurity(sql)}));}
  catch{console.error('DATABASE_SECURITY_NOT_VERIFIED');process.exitCode=1;}
  finally{await sql.end({timeout:2});}
 }
}
