import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { validateRequestDraft } from './request-validation';
import { PLANES_AUTHORITY } from './scripts/integration-preflight';

export const snapshotHash=(value:unknown):string=>{
  const stable=(v:any):any=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
};
const hosts=['direcciones507.com','www.direcciones507.com','raw.githubusercontent.com','github.com','drive.google.com','lh3.googleusercontent.com','drive.usercontent.google.com'];
export function historicalMediaUrl(value:unknown):string {
  if(typeof value!=='string'||value.length>2048)throw Error('INVALID_HISTORICAL_MEDIA');
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw Error('INVALID_HISTORICAL_MEDIA');
  return value;
}
export function validateHistoricalSnapshot(raw:any) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>64000||!/^AD507-[A-Z0-9_-]+$/.test(raw.code)||raw.version!==44)throw Error('INVALID_HISTORICAL_SNAPSHOT');
  const core=new URL(raw.coreOrigin);if(core.protocol!=='https:'||core.username||core.password||core.port||core.pathname!=='/'||core.search||core.hash)throw Error('INVALID_PUBLIC_ORIGIN');
  const u=new URL(raw.publicUrl);if(u.protocol!=='https:'||u.hostname!=='direcciones507.com'||u.username||u.password||u.port||u.search||u.hash||u.pathname!==('/'+raw.code.toLowerCase()+'/'))throw Error('INVALID_HISTORICAL_URL');
  if(!Array.isArray(raw.media)||raw.media.length>50||raw.media.some((m:any)=>!m||!['LOGO','IMAGE'].includes(m.type)))throw Error('INVALID_HISTORICAL_MEDIA');
  for(const m of raw.media)historicalMediaUrl(m.url);
  if(new Set(raw.media.map((m:any)=>m.url)).size!==raw.media.length)throw Error('INVALID_HISTORICAL_MEDIA');
  const logos=raw.media.filter((m:any)=>m.type==='LOGO').length,photos=raw.media.length-logos;
  if(raw.type==='PLACE'?logos!==0||photos!==1:raw.type!=='BUSINESS'||logos!==1)throw Error('INVALID_HISTORICAL_MEDIA');
  // Reuse the canonical field/type validator; historical media and existing capabilities
  // are preserved, rather than applying the new-upload quotas retroactively.
  const data=validateRequestDraft({...raw,commercialDescription:'',namedCode:'',postalCode:'',postalZone:'',instagram:'',facebook:'',tiktok:'',media:{logos,placePhotos:raw.type==='PLACE'?1:0,galleryPhotos:0}});
  for(const key of ['name','reference','description','hours','commercialDescription','postalCode','postalZone','email']){
    if(raw[key]!==undefined){if(typeof raw[key]!=='string'||raw[key].length>4000)throw Error('INVALID_HISTORICAL_SNAPSHOT');(data as any)[key]=raw[key];}
  }
  for(const key of ['phone','landlinePhone'])if(raw[key]!=null){if(typeof raw[key]!=='string'||raw[key].length>40)throw Error('INVALID_HISTORICAL_SNAPSHOT');(data as any)[key]=raw[key];}
  // PostgreSQL coordinates have six decimals: reject loss, never silently round history.
  for(const n of [raw.latitude,raw.longitude])if(Math.abs(n*1e6-Math.round(n*1e6))>0.00001)throw Error('INVALID_HISTORICAL_COORDINATES');
  const socials:Record<string,string>={};for(const [key,url]of Object.entries(raw.socials??{})){
    if(!['instagram','facebook','tiktok'].includes(key)||typeof url!=='string'||url.length>300)throw Error('INVALID_SOCIAL_URL');
    const s=new URL(url);if(s.protocol!=='https:'||s.username||s.password||s.port||![key+'.com','www.'+key+'.com'].includes(s.hostname))throw Error('INVALID_SOCIAL_URL');socials[key]=url;
  }
  return {...data,socials,media:{logos,placePhotos:raw.type==='PLACE'?photos:0,galleryPhotos:raw.type==='PLACE'?0:photos}};
}

/** Every redirect is validated before any request; no automatic redirects or arbitrary hosts. */
export async function boundedHistoricalRead(url:string,http:typeof fetch=fetch,max=8*1024*1024) {
  let target=historicalMediaUrl(url);
  for(let i=0;i<5;i++){
    const r=await http(target,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
    if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');if(!next)throw Error('HISTORICAL_RESOURCE_UNAVAILABLE');await r.body?.cancel();target=historicalMediaUrl(new URL(next,target).href);continue;}
    if(!r.ok||!r.body)throw Error('HISTORICAL_RESOURCE_UNAVAILABLE');
    const reader=r.body.getReader(),chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('HISTORICAL_RESOURCE_UNAVAILABLE');}chunks.push(value);}}finally{reader.releaseLock();}
    return {bytes:Buffer.concat(chunks),type:r.headers.get('content-type')??''};
  }
  throw Error('HISTORICAL_RESOURCE_UNAVAILABLE');
}
export async function verifyHistoricalPhotos(snapshot:any,http:typeof fetch=fetch) {
  const proof=[];for(const media of snapshot.media){
    const resource=await boundedHistoricalRead(media.url,http);if(!/^image\/(jpeg|png|webp)(;|$)/i.test(resource.type))throw Error('HISTORICAL_MEDIA_UNVERIFIED');
    const image=sharp(resource.bytes,{limitInputPixels:40_000_000,failOn:'warning',animated:false});
    const meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)!==1)throw Error('HISTORICAL_MEDIA_UNVERIFIED');
    await image.raw().toBuffer();proof.push({url:media.url,hash:createHash('sha256').update(resource.bytes).digest('hex')});
  }return proof;
}
export function migrationMarker(id:string,hash:string){if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(hash))throw Error('INVALID_REQUEST');return `<!-- AD507-CUTOVER:${id}:${hash} -->`;}
export async function verifyMigrationBridge(row:any,http:typeof fetch=fetch) {
  const expected=migrationMarker(row.id,row.request_data.migration.snapshotHash);
  const page=await boundedHistoricalRead(row.request_data.migration.originalUrl,http,512000);
  if(!page.type.includes('text/html')||!page.bytes.toString('utf8').includes(expected)||snapshotHash(page.bytes.toString('utf8'))!==snapshotHash(renderCommercialBridge(row.legacy_payload,row.id,row.legacy_payload.coreOrigin)))throw Error('MIGRATION_BRIDGE_NOT_VERIFIED');
}
export async function verifyHistoricalCodePresent(code:string,http:typeof fetch=fetch) {
  // action=list is the only read-only PLANES v44 endpoint. Never invoke ?code/track/stats.
  const r=await http(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`,{signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
  const reader=r.body?.getReader();if(!reader)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256000){await reader.cancel();throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');}chunks.push(value);}}finally{reader.releaseLock();}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(data.ok!==true||!Array.isArray(data.codes)||!data.codes.some((v:any)=>v.codigo===code))throw Error('HISTORICAL_RESTORE_REQUIRED');
}

/** A single-code artifact for the EXISTING Pages publisher, not a separate publisher.
 * Until PostgreSQL is ACTIVE (or after rollback), the same public URL uses PLANES.
 * Generating this HTML neither deploys Pages nor modifies PLANES/Excel.
 */
export function renderCommercialBridge(snapshot:any,id:string,coreOrigin:string) {
  validateHistoricalSnapshot(snapshot);const origin=new URL(coreOrigin);
  if(origin.origin!==new URL(snapshot.coreOrigin).origin||origin.protocol!=='https:'||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash)throw Error('INVALID_PUBLIC_ORIGIN');
  let template=readFileSync(new URL('../../ad507.template.html',import.meta.url),'utf8');
  const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  template=template.replaceAll('{{TITLE}}',esc(snapshot.name)).replaceAll('{{DESC}}',esc(snapshot.description||snapshot.reference)).replaceAll('{{CANONICAL}}',esc(snapshot.publicUrl));
  const api=JSON.stringify(origin.origin+'/v1/addresses/'+snapshot.code).replaceAll('<','\\u003c');
  const transport=`let data;try{const r=await fetch(${api},{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();const v=await r.json();if(!v.ok||v.address.code!==CODE)throw Error();const a=v.address;data={ok:true,nombre:a.name,referencia:a.reference,descripcionComercial:a.commercialDescription,plan:a.plan?.name,lat:a.coordinates.latitude,lng:a.coordinates.longitude,telefono:a.phone,telefonoFijo:a.landlinePhone,horario:a.hours,codigoPostal:a.extras.postalCode,logo:a.media.find(m=>m.type==='LOGO')?.url,fotos:a.media.filter(m=>m.type==='IMAGE').map(m=>m.url),...Object.fromEntries(a.socials.map(s=>[s.platform.toLowerCase(),s.url]))};}catch{const response=await fetch(\`\${WEBAPP_URL}?code=\${encodeURIComponent(CODE)}\`);data=await response.json();}`;
  const original='const response = await fetch(`${WEBAPP_URL}?code=${encodeURIComponent(CODE)}`);\n      const data = await response.json();';
  if(!template.includes(original))throw Error('PUBLIC_TEMPLATE_CHANGED');
  return migrationMarker(id,snapshotHash(snapshot))+'\n'+template.replace(original,transport);
}
