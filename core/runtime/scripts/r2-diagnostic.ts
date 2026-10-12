import {randomUUID} from 'node:crypto';
import {signedR2Request,type R2SigningSettings} from '../r2-signing';

type Step={ok:boolean;http?:number;code?:string};
type Report={ok:boolean;configuration:{present:Record<string,boolean>;accountFormatValid:boolean;bucketMatches:boolean};objectKey?:string;write?:Step;read?:Step;delete?:Step;absence?:Step;cleanupRequired?:boolean};
const names=['R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'];
const allowedCodes=new Set(['AccessDenied','InvalidAccessKeyId','SignatureDoesNotMatch','NoSuchBucket','NoSuchKey','RequestTimeTooSkewed','ExpiredToken','InvalidToken','PreconditionFailed','InternalError','ServiceUnavailable']);
async function bounded(response:Response,limit:number){
  const reader=response.body?.getReader();if(!reader)return Buffer.alloc(0);
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('OVERSIZED_RESPONSE');}chunks.push(value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
}
async function failure(response:Response):Promise<Step>{
  let code='UPSTREAM_ERROR';try{const text=(await bounded(response,4096)).toString('utf8');const candidate=text.match(/<Code>([A-Za-z]+)<\/Code>/)?.[1];if(candidate&&allowedCodes.has(candidate))code=candidate;}catch{code='UNREADABLE_ERROR_RESPONSE';}
  return {ok:false,http:response.status,code};
}
function network(error:unknown):Step{
  const name=error instanceof Error?error.name:'';
  return {ok:false,code:['AbortError','TimeoutError'].includes(name)?'NETWORK_TIMEOUT':'NETWORK_OR_TLS_ERROR'};
}

/** Operator-only temporary object test. Never updates env, DB, flags or media. */
export async function diagnoseR2(env:Record<string,string|undefined>,http:typeof fetch=fetch):Promise<Report>{
  const present=Object.fromEntries(names.map(name=>[name,Boolean(env[name]?.trim())]));
  const report:Report={ok:false,configuration:{present,accountFormatValid:/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID?.trim()??''),bucketMatches:env.R2_BUCKET?.trim()==='direcciones507-media'}};
  if(Object.values(present).some(v=>!v)||!report.configuration.accountFormatValid||!report.configuration.bucketMatches)return report;
  const settings:R2SigningSettings={accountId:env.R2_ACCOUNT_ID!.trim(),bucket:env.R2_BUCKET!.trim(),accessKeyId:env.R2_ACCESS_KEY_ID!.trim(),secretAccessKey:env.R2_SECRET_ACCESS_KEY!.trim()};
  const key='_diagnostics/ad507-r2/'+randomUUID()+'.txt';report.objectKey=key;
  const bytes=Buffer.from('AD507 R2 temporary connectivity check '+randomUUID());
  const send=(method:'PUT'|'GET'|'DELETE',body=new Uint8Array())=>{
    const signed=signedR2Request(settings,method,key,body,'text/plain');
    return http(signed.url,{method,headers:{...signed.headers,...(method==='PUT'?{'if-none-match':'*'}:{})},...(method==='PUT'?{body:Buffer.from(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
  };
  let cleanup=false;
  try{
    // Cleanup only our acknowledged or possibly-created object, never a key
    // rejected by the conditional write (412) or an explicit access denial.
    let put:Response;try{put=await send('PUT',bytes);}catch(error){cleanup=true;report.write=network(error);return report;}
    if(!put.ok){report.write=await failure(put);cleanup=put.status>=500;return report;}
    cleanup=true;report.write={ok:true,http:put.status};await put.body?.cancel();
    try{const get=await send('GET');if(!get.ok)report.read=await failure(get);else report.read={ok:(await bounded(get,bytes.length+1)).equals(bytes),http:get.status};}catch(error){report.read=network(error);}
  }finally{
    if(cleanup){
      report.cleanupRequired=true;
      try{
        const removed=await send('DELETE');
        if(!removed.ok)report.delete=await failure(removed);
        else {
          report.delete={ok:true,http:removed.status};await removed.body?.cancel();
          const absent=await send('GET');
          if(absent.status===404){const error=await failure(absent);report.absence={ok:error.code==='NoSuchKey',http:404,code:error.code};}
          else {report.absence={ok:false,http:absent.status,code:'DELETION_NOT_CONFIRMED'};await absent.body?.cancel();}
          report.cleanupRequired=!report.absence?.ok;
        }
      }catch(error){report.delete??=network(error);}
    }
    report.ok=Boolean(report.write?.ok&&report.read?.ok&&report.delete?.ok&&report.absence?.ok);
  }
  return report;
}
if(import.meta.main){
  try{const report=await diagnoseR2(process.env);console.log(JSON.stringify(report));process.exitCode=report.ok?0:1;}
  catch{console.log(JSON.stringify({ok:false,error:'DIAGNOSTIC_UNEXPECTED_FAILURE'}));process.exitCode=1;}
}
