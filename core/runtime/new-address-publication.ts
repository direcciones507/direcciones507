import { createHash } from 'node:crypto';
import { assertCountryCommerce, prepareCountryTemplate, proposedCountryUrl, COUNTRIES } from './country-configuration';
import { createR2Storage, type R2Settings } from './r2-storage';
import type { Sql } from 'postgres';
import { getPublicAddressByCode } from '../postgres/public-address-repository';
import { getPublicationMetadataByCode } from '../postgres/publication-repository';
import { PLANES_AUTHORITY } from './scripts/integration-preflight';
import type { CanonicalPublication } from './request-repository';
import { readFileSync } from 'node:fs';

/** No counter: new reservations derive a stable eight-digit numeric identifier from their UUID, outside the historical numeric sequence.
 * Release still requires confirmation that this namespace is exclusive across all historical channels.
 */
export function createNewAddressPublication(sql:Sql,options:{namespaceExclusive:boolean;fetch?:typeof fetch}):CanonicalPublication {
  return {
    historicalRegistryVerified:options.namespaceExclusive,
    async reserve({id,countryCode='PA'}) {
      assertCountryCommerce(countryCode);
      if(!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      // Canonical UUID layout makes removing separators injective: malformed
      // IDs must not collapse onto another request's code or shorten the suffix.
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw Error('INVALID_REQUEST');
      const response=await (options.fetch??fetch)(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`,{signal:AbortSignal.timeout(15000)});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const reader=response.body?.getReader();if(!reader)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const chunks:Uint8Array[]=[];let bytes=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256000){await reader.cancel();throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');}chunks.push(value);}}finally{reader.releaseLock();}
      const body=Buffer.concat(chunks).toString('utf8');
      const data=JSON.parse(body);
      if(data.ok!==true||!Array.isArray(data.codes)||!data.codes.length||data.codes.some((v:any)=>typeof v?.codigo!=='string'||!/^AD507-[A-Z0-9_-]+$/i.test(v.codigo.trim())))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      // Keep the new namespace separate from historical sequential AD507 codes.
      // A deterministic digest makes repeat reservations idempotent. Fail closed on
      // the rare eight-digit collision rather than assigning a duplicate code.
      const numericCode=(BigInt('0x'+createHash('sha256').update(id).digest('hex'))%100000000n).toString().padStart(8,'0');
      const code='AD507-N'+numericCode;
      if(data.codes.some((v:any)=>v.codigo.trim().toUpperCase()===code))throw Error('CANONICAL_CODE_COLLISION');
      const existing=await sql.unsafe('SELECT id::text FROM ad507.addresses WHERE upper(trim(code))=$1 AND id<>$2::uuid',[code,id]);
      if(existing.length)throw Error('CANONICAL_CODE_COLLISION');
      return code;
    },
    async publish({id,code,type}) {
      // The existing PostgreSQL reader is the new system's publication destination.
      // No call to PLANES writes, GitHub Pages, Drive, DNS or historical generators.
      if(type==='RESIDENTIAL')throw Error('RESIDENTIAL_PUBLICATION_NOT_READY');
      const rows=await sql.unsafe("SELECT id,request_data FROM ad507.addresses WHERE id=$1::uuid AND code=$2 AND source='USER_REQUEST' AND status IN ('PENDING_REVIEW','SUSPENDED') AND review_decision='APPROVED'",[id,code]);
      if(!rows.length)throw Error('APPROVAL_REQUIRED');
      if(!rows[0].request_data?.migration)assertCountryCommerce(rows[0].request_data?.countryCode??'PA');
      if(!rows[0].request_data?.migration&&!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      return {confirmed:true,receipt:'postgres:'+id+':'+code};
    },
  };
}

export async function newPublicAddress(sql:Sql,code:string,origin:string) {
  const record=await getPublicAddressByCode(sql as any,code);if(!record)return null;
  const rows=await sql.unsafe("SELECT a.id::text,a.request_data FROM ad507.addresses a WHERE a.code=$1 AND a.source='USER_REQUEST' AND a.publication_receipt IS NOT NULL",[record.code]);
  if(!rows.length)return null;
  if(!rows[0].request_data?.migration)assertCountryCommerce(rows[0].request_data?.countryCode??'PA');
  const media=await sql.unsafe("SELECT id::text,media_type,url FROM ad507.address_media WHERE address_id=$1::uuid AND upload_status='READY' ORDER BY position,id",[rows[0].id]);
  const mediaOrigin=new URL(proposedCountryUrl(rows[0].request_data?.countryCode??'PA',record.code)).origin;
  const urls=media.map((m:any)=>({type:m.media_type,url:m.url??mediaOrigin+'/v1/addresses/'+record.code+'/media/'+m.id}));
  const historical=rows[0].request_data?.migration;if(historical)record.socials=await sql.unsafe('SELECT platform,url FROM ad507.address_socials WHERE address_id=$1::uuid ORDER BY platform',[rows[0].id]);
  return {...record,...(!['PLACE'].includes(record.type)&&record.plan?.code!=='BUSINESS_PREMIUM_PRO'?{description:null,commercialDescription:null}:{}),url:historical?.originalUrl??proposedCountryUrl(rows[0].request_data?.countryCode??'PA',record.code),media:urls,publication:await getPublicationMetadataByCode(sql as any,code),extras:{historical:!!historical,countryCode:rows[0].request_data?.countryCode??'PA',postalCode:rows[0].request_data?.postalCode??null}};
}
export function renderNewPublicAddress(record:NonNullable<Awaited<ReturnType<typeof newPublicAddress>>>) {
  const social=Object.fromEntries(record.socials.map(s=>[s.platform.toLowerCase(),s.url]));
  const data={ok:true,nombre:record.name,referencia:record.reference,descripcionComercial:record.type==='PLACE'||record.plan?.code==='BUSINESS_PREMIUM_PRO'?[record.description,record.commercialDescription].filter(Boolean).join('\n\n'):null,plan:record.plan?.name,lat:record.coordinates.latitude,lng:record.coordinates.longitude,telefono:record.phone,telefonoFijo:record.landlinePhone,horario:record.hours,codigoPostal:record.extras.postalCode,logo:record.media.find(m=>m.type==='LOGO')?.url??(record.type==='PLACE'?record.media.find(m=>m.type==='IMAGE')?.url:undefined),fotos:record.media.filter(m=>m.type==='IMAGE').map(m=>m.url),...social};
  // Reuse the maintained template; adapt only its data transport for new records.
  let template=readFileSync(new URL('../../ad507.template.html',import.meta.url),'utf8');
  if(!record.extras.historical)template=prepareCountryTemplate(template,record.extras.countryCode);
  const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  if(record.type==='PLACE')template=template.replace("if(planComercial === 'premium pro' && descripcionComercial","if(descripcionComercial");
  if(record.type==='PLACE') {
    // Place-only responsive layout: leave historical and all commercial plans untouched.
    const placeCss = `<style id="place-responsive-layout">
      /* PLACE only: QR and location/reference share one row. The
         legacy template nests QR in a separate wrapper, so flatten it. */
      html[data-public-place] .white-sheet .public-lower-layout .public-business-info {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px !important;
        align-items:stretch;
        min-width:0;
      }
      html[data-public-place] .white-sheet .public-business-info .double-row-buttons {
        display:contents !important;
      }
      html[data-public-place] .white-sheet .public-business-info #btnQR,
      html[data-public-place] .white-sheet .public-business-info #btnRef {
        display:flex !important;
        grid-row:auto !important;
        grid-column:auto !important;
        width:100% !important;
        max-width:none !important;
        min-width:0 !important;
        margin:0 !important;
        align-self:stretch;
      }
      html[data-public-place] .white-sheet .public-business-info #btnQR {order:2 !important;}
      html[data-public-place] .white-sheet .public-business-info #btnRef {order:3 !important;}
      html[data-public-place] .white-sheet .public-business-info #btnHorario,
      html[data-public-place] .white-sheet .public-business-info #codigoPostalContainer,
      html[data-public-place] .white-sheet .public-business-info .public-lower-title {
        grid-column:1 / -1 !important;
      }
      html[data-public-place] .white-sheet .public-business-info #btnStats,
      html[data-public-place] .white-sheet .public-business-info #qrSection {display:none !important;}
      @media(max-width:420px) {
        html[data-public-place] .white-sheet .public-business-info #btnQR,
        html[data-public-place] .white-sheet .public-business-info #btnRef {padding:10px 7px !important;font-size:13px;}
        html[data-public-place] .white-sheet .public-business-info .accordion-label {font-size:12px !important;overflow-wrap:anywhere;}
      }
      /* Mobile PLACE identity follows the tablet hierarchy: name first, code second. */
      @media (max-width:767px) {
        html[data-public-place] .identity-block .title-details-header {
          display:flex !important;
          flex-direction:column !important;
          align-items:flex-start;
          gap:6px;
        }
        html[data-public-place] .identity-block #nombre {
          order:0 !important;
          color:#fff !important;
          font-size:clamp(21px,5.4vw,30px) !important;
          font-weight:800 !important;
          line-height:1.14 !important;
          letter-spacing:-.025em;
          overflow-wrap:break-word;
        }
        html[data-public-place] .identity-block #codigo {
          order:1 !important;
          color:#d6c2a0 !important;
          font-size:clamp(13px,3.4vw,17px) !important;
          font-weight:750 !important;
          line-height:1.3 !important;
          letter-spacing:0;
          margin:0 !important;
        }
        /* The QR button lives in a nested wrapper; flatten it so QR and
           location/reference occupy the same two-column grid row. */
        html[data-public-place] .white-sheet .public-business-info {
          display:grid !important;
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
          gap:12px !important;
          align-items:stretch;
        }
        html[data-public-place] .white-sheet .public-business-info .double-row-buttons {
          display:contents !important;
        }
        html[data-public-place] .white-sheet .public-business-info #btnQR,
        html[data-public-place] .white-sheet .public-business-info #btnRef {
          grid-row:auto !important;
          grid-column:auto !important;
          min-width:0;
          width:100% !important;
          min-height:90px;
          margin:0 !important;
          padding:10px 8px !important;
          gap:7px;
        }
        html[data-public-place] .white-sheet .public-business-info #btnQR {order:1 !important;}
        html[data-public-place] .white-sheet .public-business-info #btnRef {order:2 !important;}
        html[data-public-place] .white-sheet .public-business-info #btnQR .accordion-label,
        html[data-public-place] .white-sheet .public-business-info #btnRef .accordion-label {
          font-size:11px !important;
          overflow-wrap:anywhere;
        }
        html[data-public-place] .white-sheet .public-business-info #btnQR .accordion-value,
        html[data-public-place] .white-sheet .public-business-info #btnRef .accordion-value {
          font-size:12px !important;
          overflow-wrap:anywhere;
        }
        html[data-public-place] .white-sheet .public-business-info #btnQR .accordion-icon-left,
        html[data-public-place] .white-sheet .public-business-info #btnRef .accordion-icon-left {
          flex-shrink:0;
        }
        html[data-public-place] .white-sheet .public-business-info #btnHorario,
        html[data-public-place] .white-sheet .public-business-info #codigoPostalContainer,
        html[data-public-place] .white-sheet .public-business-info .public-lower-title {
          grid-column:1 / -1 !important;
        }
      }
      /* Reset legacy fixed grid slots that keep empty rows on tablets. */
      @media (min-width:768px) {
        html[data-public-place] .white-sheet,
        html[data-public-place] .white-sheet .public-lower-layout,
        html[data-public-place] .white-sheet .public-lower-left {
          display:flex !important;
          flex-direction:column !important;
          gap:16px !important;
          width:100%;
          min-width:0;
        }
        html[data-public-place] .white-sheet .public-lower-layout > *,
        html[data-public-place] .white-sheet .public-lower-left > *,
        html[data-public-place] .white-sheet .public-business-info,
        html[data-public-place] .white-sheet .public-social-section,
        html[data-public-place] .white-sheet .public-navigation-section {
          grid-row:auto !important;
          grid-column:auto !important;
          order:initial !important;
          width:100%;
          min-width:0;
          margin:0 !important;
        }
        html[data-public-place] .white-sheet .actions-triple-row,
        html[data-public-place] .white-sheet .main-nav-grid {
          display:grid !important;
          grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr)) !important;
        }
        html[data-public-place] .white-sheet .actions-triple-row > *,
        html[data-public-place] .white-sheet .main-nav-grid > * {
          grid-row:auto !important;
          grid-column:auto !important;
          order:initial !important;
        }
      }
      html[data-public-place] .public-social-section:has(#redes-container > :not([hidden]):not([style*="display:none"]):not([style*="display: none"])) { display:block; }
      html[data-public-place] .public-social-section:not(:has(#redes-container > :not([hidden]):not([style*="display:none"]):not([style*="display: none"]))) { display:none !important; }
      html[data-public-place] .public-navigation-section:not(:has(.nav-box:not([hidden]):not([style*="display:none"]):not([style*="display: none"]))) { display:none !important; }
      html[data-public-place] .public-business-info:not(:has(#btnHorario:not([hidden]),#btnRef:not([hidden]),#codigoPostalContainer:not([style*="display:none"]):not([style*="display: none"]),#btnQR:not([hidden]))) { display:none !important; }
      html[data-public-place] .main-nav-grid,
      html[data-public-place] .actions-triple-row {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px !important;
        align-items:stretch;
      }
      html[data-public-place] .main-nav-grid > *,
      html[data-public-place] .actions-triple-row > * {
        min-width:0;
        width:100%;
        max-width:none;
        margin:0;
      }
      html[data-public-place] .main-nav-grid > :not([hidden]):not([style*="display: none"]):last-child:nth-child(odd),
      html[data-public-place] .actions-triple-row > :not([hidden]):not([style*="display: none"]):last-child:nth-child(odd) {
        grid-column:1 / -1;
      }
      html[data-public-place] .main-nav-grid,
      html[data-public-place] .actions-triple-row { grid-auto-flow:row dense; }
      html[data-public-place] [hidden] { display:none !important; }
      html[data-public-place] .main-nav-grid > [style*="display: none"],
      html[data-public-place] .actions-triple-row > [style*="display: none"] { display:none !important; }
      html[data-public-place] .public-lower-layout,
      html[data-public-place] .public-lower-left { min-width:0; }
      html[data-public-place] #premiumGalleryContainer { max-width:100%; }
      html[data-public-place] .identity-block,
      html[data-public-place] .identity-block * { min-width:0;overflow-wrap:anywhere; }
      @media(max-width:420px) {
        html[data-public-place] .main-nav-grid,
        html[data-public-place] .actions-triple-row { gap:9px !important; }
      }
    </style>`;
    template=template.replace('<html lang="es">','<html lang="es" data-public-place>');
    template=template.replace('</head>',placeCss+'</head>');
  }
  template=template.replaceAll('{{TITLE}}',esc(record.name)).replaceAll('{{DESC}}',esc((record.type==='PLACE'||record.plan?.code==='BUSINESS_PREMIUM_PRO'?record.description:null)??record.reference??'Direcciones507')).replaceAll('{{CANONICAL}}',esc(record.url));
  // QR/share/copy must use the stored canonical URL, even on a preview host.
  // Only adapts this renderer; the historical template/files stay untouched.
  template=template.replaceAll('window.location.href',JSON.stringify(record.url).replaceAll('<','\\u003c'));
  template=template.replace('const response = await fetch(`${WEBAPP_URL}?code=${encodeURIComponent(CODE)}`);\n      const data = await response.json();','const data = '+JSON.stringify(data).replaceAll('<','\\u003c')+';');
  template=template.replace("if(window.location.protocol === 'file:') return;","return; // New records do not write historical counters.");
  template=template.replace("document.getElementById('btnStats').addEventListener('click', async function(){","document.getElementById('btnStats').hidden=true; document.getElementById('btnStats').addEventListener('click', async function(){return;");
  return template;
}

/** Route only known country namespaces; no commerce activation implied. */
function configuredPublicCode(code:string):boolean {
 const match=/^AD([0-9]{2,3})-[A-Z0-9_-]+$/.exec(code);
 return !!match&&Object.values(COUNTRIES).some(country=>country.prefix===match[1]);
}

export async function handleNewPublicRoutes(req:Request,context:{enabled:boolean;sql:Sql;r2:R2Settings|null;fetch?:typeof fetch}):Promise<Response|null>{
  const {sql}=context;const url=new URL(req.url);
  if(context.enabled&&req.method==='GET'){
    const publicMatch=url.pathname.match(/^\/(AD[0-9]{2,3}-[A-Z0-9_-]+)\/$/);
    const apiMatch=url.pathname.match(/^\/v1\/addresses\/(AD[0-9]{2,3}-[A-Z0-9_-]+)$/);
    if((publicMatch||apiMatch)&&configuredPublicCode((publicMatch??apiMatch)![1])){
      try{const record=await newPublicAddress(sql,(publicMatch??apiMatch)![1],url.origin);
        if(record)return publicMatch?new Response(renderNewPublicAddress(record),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':record.publication?.indexable?'index, follow':'noindex'}}):Response.json({ok:true,address:record},{headers:{'cache-control':'no-store','access-control-allow-origin':'https://direcciones507.com'}});
      }catch{return Response.json({ok:false,error:'PUBLICATION_UNAVAILABLE'},{status:503});}
    }
    const mediaMatch=url.pathname.match(/^\/v1\/addresses\/(AD[0-9]{2,3}-[A-Z0-9_-]+)\/media\/([a-f0-9-]{36})$/);
    if(mediaMatch&&configuredPublicCode(mediaMatch[1])){
      if(!context.r2)return new Response(null,{status:503});
      try{const rows=await sql.unsafe("SELECT a.id::text,a.request_data,m.storage_key,m.media_type FROM ad507.addresses a JOIN ad507.address_media m ON m.address_id=a.id WHERE a.code=$1 AND m.id=$2::uuid AND a.source='USER_REQUEST' AND a.status='ACTIVE' AND a.publication_receipt IS NOT NULL AND a.address_type IN ('BUSINESS','PLACE') AND m.upload_status='READY'",[mediaMatch[1],mediaMatch[2]]);
      if(!rows.length)return new Response(null,{status:404});
      const row=rows[0];
      // Keep private media closed for countries whose commercial publication is disabled.
      if(!row.request_data?.migration)assertCountryCommerce(row.request_data?.countryCode??'PA');
        const storage=createR2Storage(context.r2,{fetch:context.fetch,registerIntent:async()=>{throw Error('PUBLIC_MEDIA_READ_ONLY');},authorize:async scope=>{
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
