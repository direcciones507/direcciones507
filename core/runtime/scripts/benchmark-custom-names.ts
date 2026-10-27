import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const baseline=process.env.AD507_BASELINE_ROOT;if(!baseline)throw Error('EXPLICIT_LOCAL_BASELINE_REQUIRED');
async function modules(root:string){return {repo:(await import(pathToFileURL(resolve(root,'core/runtime/request-repository.ts')).href)).createRequestRepository,canonical:(await import(pathToFileURL(resolve(root,'core/runtime/new-address-publication.ts')).href)).createNewAddressPublication};}
async function scenario(m:any,n:number){
 let active=0,waits=0,timeouts=0;const queue:any[]=[],rows=new Map();
 const release=()=>{active--;const x=queue.shift();if(x){clearTimeout(x.timer);active++;x.resolve(release)}};
 const acquire=()=>active<2?(active++,Promise.resolve(release)):new Promise<any>((resolve,reject)=>{waits++;const x:any={resolve};x.timer=setTimeout(()=>{queue.splice(queue.indexOf(x),1);timeouts++;reject(Error('ISOLATED_POOL_WAIT_250MS'))},250);queue.push(x)});
 const query=async(q:string,args:any[]=[])=>{if(q.includes('FROM ad507.users'))return [{id:args[0]}];if(q.includes('FROM ad507.address_media'))return [{media_type:'IMAGE',upload_status:'READY'}];if(q.includes('upper(trim(code))'))return [];if(q.includes('SELECT')&&q.includes('FROM ad507.addresses'))return rows.has(args[0])?[rows.get(args[0])]:[];if(q.startsWith('UPDATE ad507.addresses SET code'))rows.get(args[0]).code=args[1];if(q.startsWith("UPDATE ad507.addresses SET status='ACTIVE'")){rows.get(args[0]).status='ACTIVE';rows.get(args[0]).publication_receipt=args[1]}return []};
 const sql={reserve:async()=>{const free=await acquire();await new Promise(r=>setTimeout(r,1));return {unsafe:query,release:free}},unsafe:async(q:string,args:any[])=>{const free=await acquire();try{return await query(q,args)}finally{free()}}};
 const canonical=m.canonical(sql,{namespaceExclusive:true,fetch:async()=>{throw Error('NO_NETWORK')}}),repo=m.repo(sql,{r2:null,canonical});
 const ids=Array.from({length:n},(_,i)=>'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'));for(const id of ids)rows.set(id,{id,status:'PENDING_REVIEW',review_decision:'APPROVED',address_type:'PLACE',country_code:'CR',request_data:{plan:'PLACE',media:{logos:0,placePhotos:1,galleryPhotos:0}}});
 const t=performance.now(),results=await Promise.allSettled(ids.map(id=>repo.publish('22222222-2222-4222-8222-222222222222',id)));
 return {concurrency:n,poolMax:2,ms:performance.now()-t,waits,timeouts,ok:results.filter(r=>r.status==='fulfilled').length};
}
const base=await modules(baseline),current=await modules(new URL('../../../',import.meta.url).pathname);
const out:any={environment:'Synthetic local pool, no network; 250ms imposed by harness, NOT a production timeout',baseline:[],corrected:[]};
for(const [name,m]of [['baseline',base],['corrected',current]] as const){for(const n of [1,2])out[name].push(await scenario(m,n));const samples=[];for(let i=0;i<110;i++){const r=await scenario(m,1);if(i>=10)samples.push(r.ms)}samples.sort((a,b)=>a-b);out[name+'Timing']={n:samples.length,p50:samples[49],p95:samples[94]};}
console.log(JSON.stringify(out,null,2));
