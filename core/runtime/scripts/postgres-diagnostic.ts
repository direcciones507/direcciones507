import postgres from 'postgres';
import {inspectCanonicalSchema} from './integration-preflight';

// Operator-only wrapper: inherits the existing service URL; all queries are
// inside the existing repeatable-read READ ONLY preflight transaction.
if(import.meta.main){
  const url=process.env.DATABASE_URL;
  if(!url){console.log(JSON.stringify({ok:false,error:'DATABASE_URL_REQUIRED'}));process.exitCode=1;}
  else {
    const sql=postgres(url,{max:1,connect_timeout:10,application_name:'ad507-read-only-preflight'});
    try{console.log(JSON.stringify({ok:true,...await inspectCanonicalSchema(sql)}));}
    catch{console.log(JSON.stringify({ok:false,error:'SCHEMA_NOT_VERIFIED'}));process.exitCode=1;}
    finally{await sql.end({timeout:2});}
  }
}
