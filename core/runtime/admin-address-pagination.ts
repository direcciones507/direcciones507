import {addressPublicUrl,publicCode} from './custom-public-code';
import type {Sql} from 'postgres';
import {requestCountry,proposedCountryUrl,freeCountryPublicationAllowed} from './country-configuration';
type Kind='addresses'|'requests'|'places';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function addressPageOptions(params:URLSearchParams,kind:Kind){
 const raw=params.get('limit')??'50';if(!/^\d{1,3}$/.test(raw)||Number(raw)<1||Number(raw)>100)throw Error('INVALID_PAGE');
 const country=params.has('country')?requestCountry(params.get('country')):null;
 let cursor:null|{time:string;id:string}=null;
 if(params.has('cursor')){
   const encoded=params.get('cursor')!;
   if(encoded.length>512||! /^[A-Za-z0-9_-]+$/.test(encoded))throw Error('INVALID_PAGE');
   try{const c=JSON.parse(Buffer.from(encoded,'base64url').toString());
     if(c.kind!==kind||c.country!==country||!uuid.test(c.id)||typeof c.time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(c.time)||!Number.isFinite(Date.parse(c.time)))throw Error();
     cursor={time:c.time,id:c.id};
   }catch{throw Error('INVALID_PAGE');}
 }
 return {limit:Number(raw),country,cursor,kind};
}
/** One indexed bounded query, keyset pagination; no accumulated-record cap or OFFSET. */
export async function adminAddressPage(sql:Sql,params:URLSearchParams,kind:Kind,ownerId?:string){
 const o=addressPageOptions(params,kind),time=kind==='requests'?'created_at':'updated_at',asc=kind==='requests',args:any[]=[];
 const where:string[]=[];
 if(ownerId){if(!uuid.test(ownerId))throw Error('INVALID_PAGE');args.push(ownerId);where.push('EXISTS(SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=$'+args.length+'::uuid)');}
 // Unpaid client drafts remain private to Mi cuenta, including PAYMENT_PENDING.
 if(!ownerId)where.push("NOT (a.status='DRAFT' AND to_jsonb(a)->>'source'='USER_REQUEST' AND COALESCE(to_jsonb(a)->'request_data'->>'createdByAdmin','')='' AND NOT EXISTS (SELECT 1 FROM ad507.orders paid WHERE paid.address_id=a.id AND a.request_data->>'plan'='BUSINESS_PREMIUM' AND paid.payment_plan='BUSINESS_PREMIUM' AND paid.status='PAID' AND paid.confirmed_at IS NOT NULL))");
 // Legacy unpaid paid requests (before PAYMENT_PENDING existed) also remain private until signed IPN.
 if(!ownerId)where.push("NOT (a.source='USER_REQUEST' AND a.status='PENDING_REVIEW' AND a.review_decision IS NULL AND a.code IS NULL AND a.publication_receipt IS NULL AND COALESCE(a.request_data->>'workflow','')='' AND COALESCE(a.request_data->>'createdByAdmin','')='' AND ((a.address_type='RESIDENTIAL' AND a.request_data->>'plan'='RESIDENTIAL') OR (a.address_type='BUSINESS' AND a.request_data->>'plan' IN ('BUSINESS_PREMIUM','BUSINESS_PREMIUM_PRO'))))");
 // Archived addresses are retired from normal ADMIN and client listings.
 where.push("a.status<>'ARCHIVED'");
 if(kind==='requests')where.push("(a.status='PENDING_REVIEW' OR (a.status='DRAFT' AND EXISTS (SELECT 1 FROM ad507.orders paid WHERE paid.address_id=a.id AND a.request_data->>'plan'='BUSINESS_PREMIUM' AND paid.payment_plan='BUSINESS_PREMIUM' AND paid.status='PAID' AND paid.confirmed_at IS NOT NULL)))");
 if(kind==='places')where.push("a.address_type='PLACE' AND a.status<>'ARCHIVED'");
 if(o.country){args.push(o.country);where.push("COALESCE(to_jsonb(a)->>'country_code','PA')=$"+args.length);}
 // Bind timestamp as text: postgres.js serializes timestamptz parameters via Date
 // (milliseconds), which would lose PostgreSQL microseconds at page boundaries.
 if(o.cursor){args.push(o.cursor.time,o.cursor.id);where.push('(a.'+time+',a.id) '+(asc?'>':'<')+' ($'+(args.length-1)+'::text::timestamptz,$'+args.length+'::uuid)');}
 args.push(o.limit+1);
 const canArchiveSql=ownerId?`(a.source='USER_REQUEST' AND a.status<>'ARCHIVED' AND to_jsonb(a)->'request_data'->'migration' IS NULL AND EXISTS (SELECT 1 FROM ad507.address_ownership o WHERE o.address_id=a.id AND o.user_id=$1::uuid AND o.ownership_role='OWNER'))`:'FALSE';
 const rows=await sql.unsafe(`SELECT (${canArchiveSql}) AS "canArchive",a.id::text,a.code,a.request_data AS "codeData",COALESCE(to_jsonb(a)->>'country_code','PA') AS "countryCode",a.address_type AS "addressType",a.status,CASE WHEN a.status='ACTIVE' AND a.publication_receipt IS NOT NULL THEN 'PUBLISHED' WHEN EXISTS (SELECT 1 FROM ad507.orders paid WHERE paid.address_id=a.id AND a.request_data->>'plan'='BUSINESS_PREMIUM' AND paid.payment_plan='BUSINESS_PREMIUM' AND paid.status='PAID' AND paid.confirmed_at IS NOT NULL) THEN 'PAYMENT_CONFIRMED' ELSE to_jsonb(a)->'request_data'->>'workflow' END AS workflow,a.name,a.reference,a.description,to_jsonb(a)->>'commercial_description' AS "commercialDescription",a.latitude,a.longitude,a.phone,a.hours,to_jsonb(a)->>'source' AS source,to_jsonb(a)->>'publication_receipt' AS "publicationReceipt",to_jsonb(a)->'request_data'->'migration'->>'originalUrl' AS "originalUrl",CASE WHEN a.address_type<>'RESIDENTIAL' THEN (SELECT m.url FROM ad507.address_media m WHERE m.address_id=a.id AND m.url IS NOT NULL ORDER BY (m.media_type='LOGO') DESC,m.is_primary DESC,m.position,m.id LIMIT 1) ELSE NULL END AS "imageUrl",p.code AS "planCode",p.name AS "planName",a.created_at AS "createdAt",a.updated_at AS "updatedAt",to_char(a.${time} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorTime" FROM ad507.addresses a LEFT JOIN ad507.plans p ON p.id=a.plan_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY a.${time} ${asc?'ASC':'DESC'},a.id ${asc?'ASC':'DESC'} LIMIT $${args.length}`,args);
 const more=rows.length>o.limit,items=rows.slice(0,o.limit),last=items.at(-1);
 const nextCursor=more&&last?Buffer.from(JSON.stringify({kind,country:o.country,time:last.cursorTime,id:last.id})).toString('base64url'):null;
 return {items:items.map(({cursorTime,publicationReceipt,originalUrl,codeData,...r})=>({...r,displayCode:publicCode({code:r.code,source:r.source,request_data:codeData}),publicUrl:r.source==='USER_REQUEST'&&r.status==='ACTIVE'&&['BUSINESS','PLACE'].includes(r.addressType)&&publicationReceipt&&(r.countryCode==='PA'||freeCountryPublicationAllowed(r.countryCode,r.addressType,r.addressType==='PLACE'?'PLACE':r.planCode))?addressPublicUrl({code:r.code,source:r.source,country_code:r.countryCode,request_data:codeData}):null})),nextCursor,count:items.length};
}
