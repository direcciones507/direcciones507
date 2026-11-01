import {proposedCountryUrl} from './country-configuration';
import {PLANES_AUTHORITY} from './scripts/integration-preflight';
export const CODE_NAMESPACE_LOCK='ad507:public-code-namespace';
export const personalizedPlan=(plan:unknown)=>['BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'].includes(String(plan));
const reserved=new Set('admin auth api v1 panel health ready metrics assets static legal planes paises ayuda inicio lugares negocios residencial premium premium-pro login logout register robots sitemap favicon index crear-cuenta mi-cuenta verificar-correo recuperar-contrasena pais country pa co cr gt sv hn ni mx'.split(' '));
export function personalizedCode(plan:string,name:string):string {
 if(!personalizedPlan(plan))throw Error('CAPABILITY_VIOLATION');
 if(typeof name!=='string'||!name||name.length>80||! /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(name)||/^AD\d+-/i.test(name)||/^N\d{8}$/i.test(name)||reserved.has(name.toLowerCase()))throw Error('INVALID_NAMED_CODE');
 return plan==='BUSINESS_PREMIUM'?'AD507-'+name:name;
}
export function publicCode(row:any):string {
 return row.source==='USER_REQUEST'&&!row.request_data?.migration&&personalizedPlan(row.request_data?.plan)&&row.request_data?.publicCode?row.request_data.publicCode:row.code;
}
export function addressPublicUrl(row:any):string {
 const code=publicCode(row);
 return code!==row.code?'https://direcciones.lat/'+code+'/':proposedCountryUrl(row.country_code??'PA',row.code,row.request_data?.migration?.originalUrl);
}
/** Caller serializes namespace writes with CODE_NAMESPACE_LOCK in the same transaction. */
export async function assertCodeAvailable(sql:any,id:string,code:string){
 const rows=await sql.unsafe(`SELECT id FROM ad507.addresses WHERE id<>$2::uuid AND (upper(trim(code))=upper($1) OR lower(request_data->>'publicCode')=lower($1) OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(request_data->'codeAliases','[]'::jsonb)) alias WHERE lower(alias)=lower($1))) LIMIT 1`,[code,id]);
 if(rows.length)throw Error('CANONICAL_CODE_COLLISION');
}
export async function verifyHistoricalCustomCode(code:string,fetcher:typeof fetch=fetch){
 // Bare Pro slugs cannot overlap the immutable AD-prefixed historical namespace.
 if(!/^AD\d{2,3}-/i.test(code))return;
 const response=await fetcher(`https://script.google.com/macros/s/${PLANES_AUTHORITY.deploymentId}/exec?action=list`,{signal:AbortSignal.timeout(15000)});
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
 const text=await response.text();if(text.length>256000)throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
 const data=JSON.parse(text);if(data.ok!==true||!Array.isArray(data.codes)||!data.codes.length||data.codes.some((r:any)=>typeof r.codigo!=='string'||!/^AD507-[A-Z0-9_-]+$/i.test(r.codigo.trim())))throw Error('HISTORICAL_REGISTRY_UNAVAILABLE');
 if(data.codes.some((r:any)=>r.codigo.trim().toLowerCase()===code.toLowerCase()))throw Error('CANONICAL_CODE_COLLISION');
}
