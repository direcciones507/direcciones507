import { createR2Storage, type R2Settings } from './r2-storage';
import type { Sql } from 'postgres';
import { getPublicAddressByCode } from '../postgres/public-address-repository';
import { getPublicationMetadataByCode } from '../postgres/publication-repository';
import { PLANES_AUTHORITY } from './scripts/integration-preflight';
import type { CanonicalPublication } from './request-repository';
import { readFileSync } from 'node:fs';

/** No counter: new reservations use their durable UUID, outside the historical numeric sequence.
 * Release still requires confirmation that this namespace is exclusive across all historical channels.
 */
export function createNewAddressPublication(sql:Sql,options:{namespaceExclusive:boolean;fetch?:typeof fetch}):CanonicalPublication {
  return {
    historicalRegistryVerified:true,
    async reserve({id}) {
      if(!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      if(!/^[a-f0-9-]{36}$/.test(id))throw Error('INVALID_REQUEST');
      const response=await (options.fetch??fetch)(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`,{signal:AbortSignal.timeout(15000)});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const reader=response.body?.getReader();if(!reader)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const chunks:Uint8Array[]=[];let bytes=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256000){await reader.cancel();throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');}chunks.push(value);}}finally{reader.releaseLock();}
      const body=Buffer.concat(chunks).toString('utf8');
      const data=JSON.parse(body);
      if(data.ok!==true||!Array.isArray(data.codes)||!data.codes.length||data.codes.some((v:any)=>typeof v?.codigo!=='string'||!/^AD507-[A-Z0-9_-]+$/.test(v.codigo)))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const code='AD507-N'+id.replaceAll('-','').toUpperCase();
      if(data.codes.some((v:any)=>v.codigo.trim().toUpperCase()===code))throw Error('CANONICAL_CODE_COLLISION');
      const existing=await sql.unsafe('SELECT id::text FROM ad507.addresses WHERE upper(trim(code))=$1 AND id<>$2::uuid',[code,id]);
      if(existing.length)throw Error('CANONICAL_CODE_COLLISION');
      return code;
    },
    async publish({id,code,type}) {
      if(!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      // The existing PostgreSQL reader is the new system's publication destination.
      // No call to PLANES writes, GitHub Pages, Drive, DNS or historical generators.
      if(type==='RESIDENTIAL')throw Error('RESIDENTIAL_PUBLICATION_NOT_READY');
      const rows=await sql.unsafe("SELECT id FROM ad507.addresses WHERE id=$1::uuid AND code=$2 AND source='USER_REQUEST' AND status='PENDING_REVIEW' AND review_decision='APPROVED'",[id,code]);
      if(!rows.length)throw Error('APPROVAL_REQUIRED');
      return {confirmed:true,receipt:'postgres:'+id+':'+code};
    },
  };
}

export async function newPublicAddress(sql:Sql,code:string,origin:string) {
  const record=await getPublicAddressByCode(sql as any,code);if(!record)return null;
  const rows=await sql.unsafe("SELECT a.id::text,a.request_data FROM ad507.addresses a WHERE a.code=$1 AND a.source='USER_REQUEST' AND a.publication_receipt IS NOT NULL",[record.code]);
  if(!rows.length)return null;
  const media=await sql.unsafe("SELECT id::text,media_type FROM ad507.address_media WHERE address_id=$1::uuid AND upload_status='READY' ORDER BY position,id",[rows[0].id]);
  const urls=media.map((m:any)=>({type:m.media_type,url:origin+'/v1/addresses/'+record.code+'/media/'+m.id}));
  return {...record,url:origin+'/'+record.code+'/',media:urls,publication:await getPublicationMetadataByCode(sql as any,code),extras:{postalCode:rows[0].request_data?.postalCode??null}};
}
export function renderNewPublicAddress(record:NonNullable<Awaited<ReturnType<typeof newPublicAddress>>>) {
  const social=Object.fromEntries(record.socials.map(s=>[s.platform.toLowerCase(),s.url]));
  const data={ok:true,nombre:record.name,referencia:record.reference,descripcionComercial:record.commercialDescription,plan:record.plan?.name,lat:record.coordinates.latitude,lng:record.coordinates.longitude,telefono:record.phone,telefonoFijo:record.landlinePhone,horario:record.hours,codigoPostal:record.extras.postalCode,logo:record.media.find(m=>m.type==='LOGO')?.url,fotos:record.media.filter(m=>m.type==='IMAGE').map(m=>m.url),...social};
  // Reuse the maintained template; adapt only its data transport for new records.
  let template=readFileSync(new URL('../../ad507.template.html',import.meta.url),'utf8');
  const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  template=template.replaceAll('{{TITLE}}',esc(record.name)).replaceAll('{{DESC}}',esc(record.description??record.reference??'Direcciones507')).replaceAll('{{CANONICAL}}',esc(record.url));
  template=template.replace('const response = await fetch(`${WEBAPP_URL}?code=${encodeURIComponent(CODE)}`);\n      const data = await response.json();','const data = '+JSON.stringify(data).replaceAll('<','\\u003c')+';');
  template=template.replace("if(window.location.protocol === 'file:') return;","return; // New records do not write historical counters.");
  template=template.replace("document.getElementById('btnStats').addEventListener('click', async function(){","document.getElementById('btnStats').hidden=true; document.getElementById('btnStats').addEventListener('click', async function(){return;");
  return template;
}

export async function handleNewPublicRoutes(req:Request,context:{enabled:boolean;sql:Sql;r2:R2Settings|null}):Promise<Response|null>{
  const {sql}=context;const url=new URL(req.url);
  if(context.enabled&&req.method==='GET'){
    const publicMatch=url.pathname.match(/^\/(AD507-[A-Z0-9]+)\/$/);
    const apiMatch=url.pathname.match(/^\/v1\/addresses\/(AD507-[A-Z0-9]+)$/);
    if(publicMatch||apiMatch){
      try{const record=await newPublicAddress(sql,(publicMatch??apiMatch)![1],url.origin);
        if(record)return publicMatch?new Response(renderNewPublicAddress(record),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':record.publication?.indexable?'index, follow':'noindex'}}):Response.json({ok:true,address:record},{headers:{'cache-control':'no-store'}});
      }catch{return Response.json({ok:false,error:'PUBLICATION_UNAVAILABLE'},{status:503});}
    }
    const mediaMatch=url.pathname.match(/^\/v1\/addresses\/(AD507-[A-Z0-9]+)\/media\/([a-f0-9-]{36})$/);
    if(mediaMatch){
      if(!context.r2)return new Response(null,{status:503});
      try{const rows=await sql.unsafe("SELECT a.id::text,m.storage_key,m.media_type FROM ad507.addresses a JOIN ad507.address_media m ON m.address_id=a.id WHERE a.code=$1 AND m.id=$2::uuid AND a.source='USER_REQUEST' AND a.status='ACTIVE' AND a.publication_receipt IS NOT NULL AND a.address_type IN ('BUSINESS','PLACE') AND m.upload_status='READY'",[mediaMatch[1],mediaMatch[2]]);
      if(!rows.length)return new Response(null,{status:404});
      const row=rows[0];
        const storage=createR2Storage(context.r2,{authorize:async scope=>{
          if(scope.action!=='read'||scope.addressId!==row.id||scope.storageKey!==row.storage_key)return false;
          const active=await sql.unsafe("SELECT id FROM ad507.addresses WHERE id=$1::uuid AND status='ACTIVE' AND source='USER_REQUEST' AND address_type IN ('BUSINESS','PLACE')",[row.id]);return !!active.length;
        }});
        const file=await storage.readPrivate({ownerId:row.id,addressId:row.id,role:row.media_type==='LOGO'?'logo':'photo',storageKey:row.storage_key});
        return new Response(file.bytes,{headers:{'content-type':'image/webp','cache-control':'no-store','x-content-type-options':'nosniff'}});
      }catch{return new Response(null,{status:503});}
    }
  }
  return null;
}
