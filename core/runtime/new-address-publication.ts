import {assertCodeAvailable,addressPublicUrl,publicCode,personalizedCode} from './custom-public-code';
import {publicAnalyticsScript} from './public-analytics';
import {cookieConsentSource} from './legal';
import { createHash } from 'node:crypto';
import { assertCountryPublication, prepareCountryTemplate, proposedCountryUrl, COUNTRIES, countryConfiguration } from './country-configuration';
import { createR2Storage, type R2Settings } from './r2-storage';
import type { Sql } from 'postgres';
import { getPublicAddressByCode } from '../postgres/public-address-repository';
import { getPublicationMetadataByCode } from '../postgres/publication-repository';
import { PLANES_AUTHORITY } from './scripts/integration-preflight';
import type { CanonicalPublication } from './request-repository';
import { requireConfirmedPayment } from './payment-repository';
import { readFileSync } from 'node:fs';

/** No counter: new reservations derive a stable eight-digit numeric identifier from their UUID, outside the historical numeric sequence.
 * Release still requires confirmation that this namespace is exclusive across all historical channels.
 */
export function createNewAddressPublication(sql:Sql,options:{namespaceExclusive:boolean;fetch?:typeof fetch}):CanonicalPublication {
  return {
    historicalRegistryVerified:options.namespaceExclusive,
    async reserve({id,countryCode='PA',type,plan,requestedName,executor=sql}) {
      assertCountryPublication(countryCode,type,plan);
      if(!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      // Canonical UUID layout makes removing separators injective: malformed
      // IDs must not collapse onto another request's code or shorten the suffix.
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw Error('INVALID_REQUEST');
      let historicalCodes:string[]=[];
      if(countryCode==='PA'){
      const response=await (options.fetch??fetch)(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`,{signal:AbortSignal.timeout(15000)});
      if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const reader=response.body?.getReader();if(!reader)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      const chunks:Uint8Array[]=[];let bytes=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256000){await reader.cancel();throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');}chunks.push(value);}}finally{reader.releaseLock();}
      const body=Buffer.concat(chunks).toString('utf8');
      const data=JSON.parse(body);
      if(data.ok!==true||!Array.isArray(data.codes)||!data.codes.length||data.codes.some((v:any)=>typeof v?.codigo!=='string'||!/^AD507-[A-Z0-9_-]+$/i.test(v.codigo.trim())))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
      historicalCodes=data.codes.map((v:any)=>v.codigo.trim().toUpperCase());
      }
      // Keep the new namespace separate from historical sequential AD507 codes.
      // A deterministic digest makes repeat reservations idempotent. Fail closed on
      // the rare eight-digit collision rather than assigning a duplicate code.
      const numericCode=(BigInt('0x'+createHash('sha256').update(id).digest('hex'))%100000000n).toString().padStart(8,'0');
      const personalized=String(requestedName??'').trim().toUpperCase();
      if(personalized&&!(type==='BUSINESS'&&['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(plan)))throw Error('CAPABILITY_VIOLATION');
      if(personalized&&!/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(personalized))throw Error('INVALID_NAMED_CODE');
      // Prefix is mandatory for the country namespace. Accept an already-prefixed
      // name too, without doubling the country prefix.
      const prefix='AD'+countryConfiguration(countryCode).prefix+'-';
      const code=personalized?(personalized.startsWith(prefix)?personalized:prefix+personalized):prefix+'N'+numericCode;
      if(historicalCodes.includes(code))throw Error('CANONICAL_CODE_COLLISION');
      await assertCodeAvailable(executor,id,code);
      return code;
    },
    async publish({id,code,type,executor=sql,automaticPaid=false,paymentEnvironment}) {
      // The existing PostgreSQL reader is the new system's publication destination.
      // No call to PLANES writes, GitHub Pages, Drive, DNS or historical generators.
      if(type==='RESIDENTIAL')throw Error('RESIDENTIAL_PUBLICATION_NOT_READY');
      const rows=await executor.unsafe("SELECT id,request_data,address_type,country_code FROM ad507.addresses WHERE id=$1::uuid AND code=$2 AND source='USER_REQUEST' AND ((status IN ('PENDING_REVIEW','SUSPENDED') AND review_decision='APPROVED') OR ($3::boolean AND status='DRAFT' AND request_data->>'workflow'='PAYMENT_PENDING' AND request_data->>'plan'='BUSINESS_PREMIUM' AND request_data->'migration' IS NULL))",[id,code,automaticPaid]);
      if(!rows.length)throw Error('APPROVAL_REQUIRED');
      if(automaticPaid){
        if(!paymentEnvironment)throw Error('PAYMENT_ENVIRONMENT_REQUIRED');
        await requireConfirmedPayment(executor,rows[0],paymentEnvironment);
      }
      if(!rows[0].request_data?.migration)assertCountryPublication(rows[0].country_code??rows[0].request_data?.countryCode??'PA',rows[0].address_type,rows[0].request_data?.plan);
      if(!rows[0].request_data?.migration&&!options.namespaceExclusive)throw Error('HISTORICAL_NAMESPACE_NOT_VERIFIED');
      return {confirmed:true,receipt:'postgres:'+id+':'+code};
    },
  };
}

export async function newPublicAddress(sql:Sql,code:string,origin:string) {
  const matches=await sql.unsafe(`SELECT code FROM ad507.addresses WHERE source='USER_REQUEST' AND (lower(code)=lower($1) OR (request_data->'migration' IS NULL AND request_data->>'plan' IN ('BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO') AND (lower(request_data->>'publicCode')=lower($1) OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(request_data->'codeAliases','[]'::jsonb)) alias WHERE lower(alias)=lower($1))))) LIMIT 2`,[code]);
  if(matches.length>1)throw Error('CANONICAL_CODE_COLLISION');
  if(!matches.length)return null;
  const internalCode=matches[0].code;
  const record=await getPublicAddressByCode(sql as any,internalCode);if(!record)return null;
  const rows=await sql.unsafe("SELECT a.id::text,a.request_data,a.country_code,a.address_type FROM ad507.addresses a WHERE a.code=$1 AND a.source='USER_REQUEST' AND a.publication_receipt IS NOT NULL",[record.code]);
  if(!rows.length)return null;
  if(!rows[0].request_data?.migration)assertCountryPublication(rows[0].country_code??rows[0].request_data?.countryCode??'PA',rows[0].address_type,rows[0].request_data?.plan);
  const media=await sql.unsafe("SELECT id::text,media_type,url FROM ad507.address_media WHERE address_id=$1::uuid AND upload_status='READY' ORDER BY position,id",[rows[0].id]);
  const mediaOrigin=new URL(proposedCountryUrl(rows[0].request_data?.countryCode??'PA',record.code)).origin;
  const urls=media.map((m:any)=>({type:m.media_type,url:m.url??mediaOrigin+'/v1/addresses/'+record.code+'/media/'+m.id}));
  const historical=rows[0].request_data?.migration;if(historical)record.socials=await sql.unsafe('SELECT platform,url FROM ad507.address_socials WHERE address_id=$1::uuid ORDER BY platform',[rows[0].id]);
  return {...record,...(!['PLACE'].includes(record.type)&&record.plan?.code!=='BUSINESS_PREMIUM_PRO'?{description:null,commercialDescription:null}:{}),url:addressPublicUrl({...rows[0],code:record.code,source:'USER_REQUEST'}),media:urls,publication:await getPublicationMetadataByCode(sql as any,internalCode),extras:{publicCode:publicCode({...rows[0],code:record.code,source:'USER_REQUEST'}),historical:!!historical,countryCode:rows[0].request_data?.countryCode??'PA',postalCode:rows[0].request_data?.postalCode??null}};
}
export function renderNewPublicAddress(record:NonNullable<Awaited<ReturnType<typeof newPublicAddress>>>) {
  const social=Object.fromEntries(record.socials.map(s=>[s.platform.toLowerCase(),s.url]));
  const data={ok:true,nombre:record.name,referencia:record.reference,descripcionComercial:record.type==='PLACE'||record.plan?.code==='BUSINESS_PREMIUM_PRO'?[record.description,record.commercialDescription].filter(Boolean).join('\n\n'):null,plan:record.plan?.name,lat:record.coordinates.latitude,lng:record.coordinates.longitude,telefono:record.phone,telefonoFijo:record.landlinePhone,horario:record.hours,codigoPostal:record.extras.postalCode,logo:record.media.find(m=>m.type==='LOGO')?.url??(record.type==='PLACE'?record.media.find(m=>m.type==='IMAGE')?.url:undefined),fotos:record.media.filter(m=>m.type==='IMAGE').map(m=>m.url),...social};
  // Reuse the maintained template; adapt only its data transport for new records.
  let template=readFileSync(new URL('../../ad507.template.html',import.meta.url),'utf8');
  if(!record.extras.historical){
    template=prepareCountryTemplate(template,record.extras.countryCode);
    // New Core pages are hosted at direcciones.lat (also for Panama). Their
    // relative /assets icons do not live on this host. Use the same verified
    // absolute favicon assets as the shared account; leave legacy HTML alone.
    template=template.replace('href="/assets/icon-192.png"','href="https://direcciones507.com/assets/icon-192.png"')
      .replace('href="/assets/icon-180.png"','href="https://direcciones507.com/assets/icon-180.png"');
    // New non-Panama records have their own LATAM emblem. Panama, the
    // historical template and dynamic business OG previews remain unchanged.
    if(record.extras.countryCode!=='PA'){
      const latamIcon='https://direcciones507.com/assets/favicon-latam-32.png';
      template=template.replace('sizes="192x192" href="https://direcciones507.com/assets/icon-192.png"','sizes="32x32" href="'+latamIcon+'"')
        .replace('sizes="180x180" href="https://direcciones507.com/assets/icon-180.png"','href="'+latamIcon+'"');
    }
  }
  // Place-only layout. Header name/code stay centered above logo and description.
  if(!record.extras.historical && record.type==='PLACE'){
    template=template.replace('</head>',`<style id="place-presentation-layout">
      .card .identity-block{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important;align-items:center!important;text-align:center!important}
      .card .identity-block .title-details-header{display:contents!important}
      .card .identity-block #nombre{grid-row:1!important;grid-column:1/-1!important;text-align:center!important;overflow-wrap:anywhere;margin:0!important}
      .card .identity-block #codigo{grid-row:2!important;grid-column:1/-1!important;text-align:center!important;margin:0!important}
      .card .identity-block #logoBox{grid-row:3!important;grid-column:1!important;justify-self:center!important}
      .card .identity-block #placeHeaderDescription{grid-row:4!important;grid-column:1!important;box-sizing:border-box;width:100%!important;margin:0!important;padding:16px!important;border-radius:16px;border:1px solid rgba(96,165,250,.3);background:#12243b;color:#fff;text-align:left;white-space:pre-line;line-height:1.5}
      .card .white-sheet #commercialDescription{display:none!important}
      .card .white-sheet .place-ad-preview{order:-3!important;margin:0 0 16px!important}
      .card .white-sheet #premiumGalleryContainer{order:-2!important}
      @media(min-width:768px){
        .card .identity-block{grid-template-columns:210px minmax(0,1fr)!important;gap:16px 24px!important}
        .card .identity-block #logoBox{grid-row:3!important;grid-column:1!important}
        .card .identity-block #placeHeaderDescription{grid-row:3!important;grid-column:2!important;align-self:center!important}
      }
      @media(min-width:1200px){.card .identity-block{grid-template-columns:250px minmax(0,1fr)!important}}
      @media(max-width:767px){
        .card .identity-block{padding:22px 18px!important}
        .card .identity-block #logoBox{margin:0 auto!important}
        .card .identity-block #nombre{font-size:clamp(20px,5vw,29px)!important}
        .card .identity-block #placeHeaderDescription{margin-top:4px!important}
        .card .white-sheet .place-ad-preview{margin:0 0 16px!important}
      }
    </style></head>`);
    template=template.replace('</body>',`<script>(function(){function updatePlaceHeader(){var source=document.getElementById('commercialDescriptionText');var header=document.querySelector('.identity-block');if(!source||!header)return;var value=(source.textContent||'').trim();if(!value)return;var target=document.getElementById('placeHeaderDescription');if(!target){target=document.createElement('div');target.id='placeHeaderDescription';header.appendChild(target)}target.textContent=value;}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updatePlaceHeader);else updatePlaceHeader();window.addEventListener('load',updatePlaceHeader);})()</script></body>`);
  }
  // Place-only advertising preview. No checkout, account entry, or booking is enabled yet.
  if(!record.extras.historical && record.type==='PLACE'){
    template=template.replace('</head>',`<style id="place-ad-preview-style">
      #codigoPostalContainer{display:none!important}
      .place-ad-preview{margin:20px 0;padding:20px;border:1px solid #355273;border-radius:18px;background:#13253e;color:#f4f8ff;text-align:center}
      .place-ad-preview strong{display:block;font-size:18px;margin-bottom:6px}
      .place-ad-preview p{margin:5px 0;color:#cbd5e1}
      .place-ad-preview .place-ad-price{font-size:20px;font-weight:700;color:#fff}
      .place-ad-preview .place-ad-coming{display:inline-block;margin-top:12px;padding:10px 22px;border-radius:12px;background:#263b56;color:#fff;font-weight:700}
    </style></head>`);
    template=template.replace('<section id="commercialDescription"',`<aside class="place-ad-preview" aria-label="Publicidad próximamente"><strong>Anuncia tu negocio aquí</strong><p>Publicidad en este Lugar</p><p class="place-ad-price">$8.99 por 30 días</p><span class="place-ad-coming">Próximamente</span></aside><section id="commercialDescription"`);
  }
  // Place only: compact visible actions and navigation without empty grid cells.
  if(!record.extras.historical && record.type==='PLACE'){
    template=template.replace('</head>',`<style id="place-conditional-button-grid">
      @media(min-width:768px){
        .card .white-sheet .actions-triple-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
        .card .white-sheet .actions-triple-row:has(#btnCall:not([hidden])):has(#btnLandline:not([hidden])){grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .card .white-sheet .actions-triple-row>.btn-action-triple{grid-column:auto!important;grid-row:auto!important;order:0!important;width:100%!important;box-sizing:border-box!important}
        .card .white-sheet .actions-triple-row>.btn-action-triple[hidden]{display:none!important}
        .card .white-sheet .main-nav-grid:has(>.nav-box[hidden]){grid-template-columns:repeat(3,minmax(0,1fr))!important}
        .card .white-sheet .main-nav-grid>.nav-box[hidden]{display:none!important}
      }
    </style></head>`);
  }
  // Premium only: 3 equal actions without landline, 2x2 when a landline exists.
  // Keep existing DOM order, click handlers and phone icon; never reserve hidden slots.
  if(!record.extras.historical && record.plan?.code==='BUSINESS_PREMIUM'){
    template=template.replace('</head>',`<style id="premium-conditional-contact-grid">
      .card .white-sheet .public-lower-layout .actions-triple-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
      .card .white-sheet .public-lower-layout .actions-triple-row:has(#btnLandline:not([hidden])){grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .card .white-sheet .public-lower-layout .actions-triple-row>.btn-action-triple{grid-column:auto!important;grid-row:auto!important;order:0!important;width:100%!important;min-width:0!important;box-sizing:border-box!important}
      .card .white-sheet .public-lower-layout .actions-triple-row>#btnLandline[hidden]{display:none!important}
      .card .white-sheet .public-lower-layout .actions-triple-row>#btnLandline:not([hidden]){display:flex!important}
      .card .white-sheet .public-lower-layout #btnLandline i{color:#dc2626!important}
      @media(max-width:767px){
        .card .white-sheet .actions-triple-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
        .card .white-sheet .actions-triple-row:has(#btnLandline:not([hidden])){grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .card .white-sheet .actions-triple-row>.btn-action-triple{flex:none!important;grid-column:auto!important;grid-row:auto!important;order:0!important;width:100%!important;min-width:0!important;box-sizing:border-box!important}
        .card .white-sheet .actions-triple-row>#btnLandline[hidden]{display:none!important}
        .card .white-sheet .actions-triple-row>#btnLandline:not([hidden]){display:flex!important}
        .card .white-sheet .public-lower-layout .actions-triple-row{gap:8px!important}
        .card .white-sheet .public-lower-layout .actions-triple-row>.btn-action-triple{padding-inline:5px!important;overflow-wrap:anywhere}
      }
    </style></head>`);
  }
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
        html[data-public-place] .white-sheet .public-lower-layout {
          display:grid !important;
          grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) !important;
          gap:24px !important;
          align-items:start;
          width:100%;
          min-width:0;
        }
        html[data-public-place] .white-sheet .public-lower-left {
          display:flex !important;
          flex-direction:column !important;
          gap:16px !important;
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
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
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
    // Place QR and reference in one real shared row. The template's QR
    // originates inside a separate wrapper; CSS grid alone cannot reliably
    // keep the two accordion items adjacent across mobile breakpoints.
    const placePairCss = `<style id="place-qr-reference-pair">
      html[data-public-place] .place-qr-reference-pair {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:12px !important;
        grid-column:1 / -1 !important;
        width:100%;
        min-width:0;
        align-items:stretch;
      }
      html[data-public-place] .place-qr-reference-pair #btnQR,
      html[data-public-place] .place-qr-reference-pair #btnRef {
        display:flex !important;
        grid-column:auto !important;
        grid-row:auto !important;
        width:100% !important;
        min-width:0 !important;
        min-height:84px;
        margin:0 !important;
        padding:12px 8px !important;
        box-sizing:border-box;
      }
      html[data-public-place] .place-qr-reference-pair .accordion-content-text {
        min-width:0;
        overflow-wrap:anywhere;
      }
      @media(max-width:420px) {
        html[data-public-place] .place-qr-reference-pair {gap:9px !important;}
        html[data-public-place] .place-qr-reference-pair .accordion-label {font-size:11px !important;}
        html[data-public-place] .place-qr-reference-pair .accordion-value {font-size:12px !important;}
      }
    </style>`;
    template=template.replace('</head>',placePairCss+'</head>');
    template=template.replace('</body>',`<script>
      (function(){
        function alignPlaceControls(){
          const qr=document.getElementById('btnQR');
          const ref=document.getElementById('btnRef');
          if(!qr||!ref||!ref.parentElement||document.querySelector('.place-qr-reference-pair'))return;
          const pair=document.createElement('div');
          pair.className='place-qr-reference-pair';
          ref.parentElement.insertBefore(pair,ref);
          pair.append(qr,ref);
        }
        if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',alignPlaceControls,{once:true});
        else alignPlaceControls();
      })();
    </script></body>`);
  }
  // Paid new business cards: relocate available social links to the center of the
  // tablet/desktop footer. Historical publications and mobile layout stay intact.
  if(!record.extras.historical && ['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(record.plan?.code??'')){
    const premiumProTablet=record.plan?.code==='BUSINESS_PREMIUM_PRO';
    const footerSocialCss = `<style id="paid-business-footer-socials">
      @media(min-width:768px){
        .premium-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:center}
        .premium-footer .footer-brand-side{justify-self:start}
        .premium-footer .footer-secure-side{grid-column:3;justify-self:end;text-align:right}
        .premium-footer .footer-social-center{grid-column:2;display:flex;align-items:center;justify-content:center;gap:12px}
        .premium-footer .footer-social-center:empty{visibility:hidden}
        .premium-footer .footer-social-center a{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#182a43;color:#fff;text-decoration:none;border:1px solid #46617d}
        .premium-footer .footer-social-center a[data-social="Facebook"]{background:#1877f2;border-color:#1877f2;color:#fff}
        .premium-footer .footer-social-center a[data-social="Instagram"]{background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);border-color:#d62976;color:#fff}
        .premium-footer .footer-social-center a[data-social="TikTok"]{background:#000;border-color:#333;color:#fff}
        .premium-footer .footer-social-center a:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}
        .premium-footer .footer-social-center svg{width:20px;height:20px;fill:currentColor}
        .public-lower-layout .public-social-section{display:none!important}
      }
      /* Premium and Premium Pro: remove unused vertical space above social footer on tablets. */
      @media (min-width:768px) and (max-width:1199px){
        .card{min-height:0!important;justify-content:flex-start!important}
        .card .white-sheet{flex:0 0 auto!important;margin-bottom:0!important;padding-bottom:0!important}
        .card .white-sheet .public-lower-layout{margin-bottom:0!important;padding-bottom:0!important}
        .card .premium-footer{flex:0 0 auto!important;margin-top:0!important}
      }
      @media (min-width:768px){
        .card:has(.premium-footer){justify-content:flex-start!important}
        .card:has(.premium-footer) .white-sheet{flex-grow:0!important}
        .card:has(.premium-footer) .premium-footer{margin-top:0!important}
      }
      ${premiumProTablet?`/* Premium Pro tablets only: fix the actual footer clone, not the hidden source links. */
      @media (min-width:768px) and (max-width:1199px) and (min-height:600px),
             (min-width:1200px) and (max-width:1366px) and (min-height:600px) and (pointer:coarse) {
        .premium-footer .footer-social-center a[data-social]{background:none;border:0;border-radius:0;box-shadow:none}
        .premium-footer .footer-social-center a[data-social="Instagram"]{color:#e1306c}
        .premium-footer .footer-social-center a[data-social="Facebook"]{color:#1877f2}
        .premium-footer .footer-social-center a[data-social="TikTok"]{color:#fff}
        .premium-footer .footer-social-center svg.wide-card-icon{display:block;flex:none;width:28px;height:28px;fill:currentColor}
        .card{min-height:0}
        .card .code-header{padding-top:14px;padding-bottom:14px}
        .card .identity-block{min-height:0;padding-top:12px;padding-bottom:12px}
        .card .identity-block .title-details-header{align-items:center;justify-content:flex-start;align-self:start;text-align:center}
        .card .identity-block #nombre{order:1;width:100%;text-align:center}
        .card .identity-block #codigo{order:2;width:100%;text-align:center}
        .card .white-sheet{flex:0 0 auto;padding-top:14px;padding-bottom:12px;gap:14px}
        /* Keep the original node/slot so existing lower-layout selectors stay intact. */
        .card .white-sheet #commercialDescription{display:none!important}
        .card .white-sheet #commercialDescription.is-visible{display:block!important;position:absolute;top:var(--tablet-description-top);left:var(--tablet-description-left);width:var(--tablet-description-width);max-height:var(--tablet-description-height);margin:0;padding:12px;overflow:auto;box-sizing:border-box;box-shadow:none}
        .card .white-sheet .public-lower-layout{padding-bottom:0}
        /* Premium Pro: remove the empty flex space between the lower content and social footer. */
        .card{justify-content:flex-start}
        .card .white-sheet{flex-grow:0;flex-shrink:0;margin-bottom:0}
        .card .white-sheet .public-lower-layout{margin-bottom:0;padding-bottom:0}
        .card .premium-footer{flex:0 0 auto;align-self:stretch;margin-top:0!important;padding-top:8px;padding-bottom:10px}
      }`:''}
    </style>`;
    template=template.replace('</head>',footerSocialCss+'</head>');
    template=template.replace('</body>',`<script>
      (function(){
        function placeFooterSocials(){
          const footer=document.querySelector('.premium-footer');
          if(!footer||footer.querySelector('.footer-social-center'))return;
          const center=document.createElement('nav');
          center.className='footer-social-center';
          center.setAttribute('aria-label','Redes sociales del negocio');
          for(const [id,label] of [['btnFacebook','Facebook'],['btnInstagram','Instagram'],['btnTikTok','TikTok']]){
            const original=document.getElementById(id);
            const href=original?.getAttribute('href');
            if(!href||!/^https?:\\/\\//i.test(href))continue;
            let url;try{url=new URL(href);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue}catch{continue}
            const link=document.createElement('a');
            link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',label);link.title=label;link.dataset.social=label;
            const icon=original.querySelector('svg.tablet-social-glyph')||original.querySelector('svg.wide-card-icon');
            if(icon){
              const glyph=icon.cloneNode(true);glyph.classList.remove('tablet-social-glyph');glyph.classList.add('wide-card-icon');glyph.style.display='block';glyph.style.visibility='visible';
              // A cloned <use> needs its symbol's coordinate system; retain all hrefs.
              {
                const reference=glyph.querySelector('use')?.getAttribute('href');
                const symbol=reference?.startsWith('#')?document.getElementById(reference.slice(1)):null;
                if(symbol?.getAttribute('viewBox'))glyph.setAttribute('viewBox',symbol.getAttribute('viewBox'));
              }
              link.append(glyph);
            }else link.textContent=label;
            center.append(link);
          }
          footer.insertBefore(center,footer.querySelector('.footer-secure-side'));
        }
        placeFooterSocials();
        window.addEventListener('load',()=>{document.querySelector('.premium-footer .footer-social-center')?.remove();placeFooterSocials()},{once:true});
        // Social links are populated asynchronously by the template after load.
        // Reconcile clones when hrefs arrive, rather than cloning empty links.
        const sourceSocials=document.getElementById('redes-container');
        if(sourceSocials){new MutationObserver(()=>{document.querySelector('.premium-footer .footer-social-center')?.remove();placeFooterSocials()}).observe(sourceSocials,{subtree:true,attributes:true,attributeFilter:['href','style','hidden']})}
        ${premiumProTablet?`// Position only the existing description inside the free header area.
        // Absolute placement preserves the exact gallery and lower-layout geometry.
        window.addEventListener('load',()=>{
          const description=document.getElementById('commercialDescription');
          const title=document.querySelector('.identity-block .title-details-header');
          const header=document.querySelector('.identity-block');
          const card=document.querySelector('.card');
          if(!description||!title||!header||!card)return;
          const tablet=matchMedia('(min-width:768px) and (max-width:1199px) and (min-height:600px), (min-width:1200px) and (max-width:1366px) and (min-height:600px) and (pointer:coarse)');
          const place=()=>{
            if(!tablet.matches)return;
            const c=card.getBoundingClientRect(),t=title.getBoundingClientRect(),h=header.getBoundingClientRect();
            const top=t.bottom+10;
            const values={top:top-c.top-card.clientTop,left:t.left-c.left-card.clientLeft,width:t.width,height:Math.max(0,h.bottom-12-top)};
            for(const [key,value] of Object.entries(values))description.style.setProperty('--tablet-description-'+key,value+'px');
          };
          const observer=new ResizeObserver(place);observer.observe(card);observer.observe(title);observer.observe(header);
          tablet.addEventListener('change',place);window.addEventListener('resize',place);
          document.fonts.ready.then(place);place();
        },{once:true});`:''}

      })();
    </script></body>`);
  }
  // Premium OG metadata must use the same server-rendered public metadata path as Premium Pro.
  // Preserve the established behavior of Place, Free Business and Premium Pro.
  const premiumOg=record.plan?.code==='BUSINESS_PREMIUM'&&!record.extras.historical;
  const ogDescription=premiumOg?[record.name,record.reference].filter(Boolean).join(' · '):((record.type==='PLACE'||record.plan?.code==='BUSINESS_PREMIUM_PRO'?record.description:null)??record.reference??'Direcciones507');
  template=template.replaceAll('{{TITLE}}',esc(record.name)).replaceAll('{{DESC}}',esc(ogDescription)).replaceAll('{{CANONICAL}}',esc(record.url));
  // Social crawlers read initial HTML, not client-side JavaScript.
  // Prefer the owner logo, then the main photo. Residential keeps its existing policy.
  const preservePreview=record.type==='RESIDENTIAL'||record.extras.historical;
  const previewTypes=preservePreview?['IMAGE','LOGO']:['LOGO','IMAGE'];
  const previewImage=previewTypes.map(type=>record.media.find(m=>m.type===type&&m.url?.startsWith('https://'))?.url).find(Boolean)
    ??(!preservePreview&&new URL(record.url).hostname==='direcciones.lat'?'https://direcciones.lat/assets/og-latam-map-v2.jpg':'https://direcciones507.com/assets/logo-direcciones507.png?v=2');
  template=template.replace(/<meta property="og:image" content="[^"]*">/,
    '<meta property="og:image" content="'+esc(previewImage)+'">'+(preservePreview?'':'\n  <meta property="og:image:secure_url" content="'+esc(previewImage)+'">'));
  template=template.replaceAll('{{OG_IMAGE}}',esc(previewImage));
  // Photo dimensions are not guaranteed to be square; omit the legacy fixed dimensions.
  if(!preservePreview){
    template=template.replace(/\s*<meta property="og:image:(?:width|height)" content="[^"]*">/g,'');
  }
  if(!record.extras.historical&&record.extras.publicCode&&record.extras.publicCode!==record.code)template=template.replace('const CODE = (pathCode || \"AD507-CODE\").toUpperCase();','const CODE = '+JSON.stringify(record.extras.publicCode)+';');
  // QR/share/copy must use the stored canonical URL, even on a preview host.
  // Only adapts this renderer; the historical template/files stay untouched.
  template=template.replaceAll('window.location.href',JSON.stringify(record.url).replaceAll('<','\\u003c'));
  template=template.replace('const response = await fetch(`${WEBAPP_URL}?code=${encodeURIComponent(CODE)}`);\n      const data = await response.json();','const data = '+JSON.stringify(data).replaceAll('<','\\u003c')+';');
  template=template.replace("if(window.location.protocol === 'file:') return;","return; // New records do not write historical counters.");
  template=template.replace("document.getElementById('btnStats').addEventListener('click', async function(){","document.getElementById('btnStats').hidden=true; document.getElementById('btnStats').addEventListener('click', async function(){return;");
  template=template.replace('</body>','<script>'+cookieConsentSource+'</script><script>'+publicAnalyticsScript(record.code)+'</script></body>');
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
    const publicMatch=url.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_-]{0,89})\/$/);
    const apiMatch=url.pathname.match(/^\/v1\/addresses\/(AD[0-9]{2,3}-[A-Z0-9_-]+)$/);
    if(publicMatch&&!configuredPublicCode(publicMatch[1].toUpperCase())){try{personalizedCode('BUSINESS_PREMIUM_PRO',publicMatch[1]);}catch{return null;}}
    if(publicMatch||apiMatch&&configuredPublicCode(apiMatch[1])){
      try{const code=(publicMatch??apiMatch)![1];
        const record=await newPublicAddress(sql,code,url.origin);
        if(record&&publicMatch&&!record.extras.historical&&publicMatch[1]!==record.extras.publicCode)return new Response(null,{status:308,headers:{location:record.url,'cache-control':'no-store'}});
        if(record)return publicMatch?new Response(renderNewPublicAddress(record),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':record.publication?.indexable?'index, follow':'noindex'}}):Response.json({ok:true,address:record},{headers:{'cache-control':'no-store','access-control-allow-origin':'https://direcciones507.com'}});
        // Owner-retired pages are permanently gone: do not fall back to historical
        // rendering, and let Google discover the 410 instead of a soft-404.
        const retired=await sql.unsafe("SELECT 1 FROM ad507.addresses WHERE code=$1 AND source='USER_REQUEST' AND status='ARCHIVED' LIMIT 1",[code]);
        if(retired.length)return publicMatch
          ?new Response('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Dirección retirada</title></head><body><main><h1>Esta dirección digital ya no está disponible</h1><p>El propietario retiró esta dirección.</p></main></body></html>',{status:410,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}})
          :Response.json({ok:false,error:'ADDRESS_RETIRED'},{status:410,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
      }catch{return Response.json({ok:false,error:'PUBLICATION_UNAVAILABLE'},{status:503});}
    }
    const mediaMatch=url.pathname.match(/^\/v1\/addresses\/(AD[0-9]{2,3}-[A-Z0-9_-]+)\/media\/([a-f0-9-]{36})$/);
    if(mediaMatch&&configuredPublicCode(mediaMatch[1])){
      if(!context.r2)return new Response(null,{status:503});
      try{const rows=await sql.unsafe("SELECT a.id::text,a.request_data,a.country_code,a.address_type,m.storage_key,m.media_type FROM ad507.addresses a JOIN ad507.address_media m ON m.address_id=a.id WHERE a.code=$1 AND m.id=$2::uuid AND a.source='USER_REQUEST' AND a.status='ACTIVE' AND a.publication_receipt IS NOT NULL AND a.address_type IN ('BUSINESS','PLACE') AND m.upload_status='READY'",[mediaMatch[1],mediaMatch[2]]);
      if(!rows.length)return new Response(null,{status:404});
      const row=rows[0];
      // Keep private media closed for countries whose commercial publication is disabled.
      if(!row.request_data?.migration)assertCountryPublication(row.country_code??row.request_data?.countryCode??'PA',row.address_type,row.request_data?.plan);
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
