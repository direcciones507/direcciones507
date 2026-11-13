/**
 * Dirección Temporal: server-side draft validation, not a public route.
 * Keep private responsible contact separate from public event fields.
 * No payment or publication is triggered by this module.
 */
export type TemporaryEventDraft = {
 title:string;description:string;responsibleName:string;responsibleEmail:string;responsiblePhone:string;
 countryCode:string;province:string;district:string;corregimiento:string;reference:string;
 startsOn:string;endsOn:string;timezone:string;hours:string;
 latitude?:number|null;longitude?:number|null;
 publicContactName?:string;publicContactPhone?:string;publicContactConsent?:boolean;
};
const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
function validDate(value:string):boolean {
 if(!isoDate.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
export function validateTemporaryEventDraft(input:unknown):TemporaryEventDraft {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_EVENT_DRAFT');
 const x=input as Record<string,unknown>;
 const draft:TemporaryEventDraft={
  title:clean(x.title,160),description:clean(x.description,5000),
  responsibleName:clean(x.responsibleName,160),responsibleEmail:clean(x.responsibleEmail,254),
  responsiblePhone:clean(x.responsiblePhone,40),countryCode:clean(x.countryCode,2).toUpperCase(),
  province:clean(x.province,120),district:clean(x.district,120),corregimiento:clean(x.corregimiento,120),
  reference:clean(x.reference,300),startsOn:clean(x.startsOn,10),endsOn:clean(x.endsOn,10),
  timezone:clean(x.timezone,80),hours:clean(x.hours,400),
  latitude:x.latitude===undefined||x.latitude===null||x.latitude===''?null:Number(x.latitude),
  longitude:x.longitude===undefined||x.longitude===null||x.longitude===''?null:Number(x.longitude),
  publicContactConsent:x.publicContactConsent===true,
  publicContactName:clean(x.publicContactName,160),publicContactPhone:clean(x.publicContactPhone,40)
 };
 if(draft.title.length<3||!draft.responsibleName||!email.test(draft.responsibleEmail)||!draft.responsiblePhone)throw Error('INVALID_EVENT_IDENTITY');
 if(!/^[A-Z]{2}$/.test(draft.countryCode)||!draft.province||!draft.district||!draft.corregimiento)throw Error('INVALID_EVENT_LOCATION');
 if(!validDate(draft.startsOn)||!validDate(draft.endsOn))throw Error('INVALID_EVENT_DATES');
 const days=(Date.parse(draft.endsOn+'T00:00:00Z')-Date.parse(draft.startsOn+'T00:00:00Z'))/86400000+1;
 if(days<1||days>60)throw Error('EVENT_DURATION_OUT_OF_RANGE');
 try{new Intl.DateTimeFormat('en',{timeZone:draft.timezone}).format()}catch{throw Error('INVALID_EVENT_TIMEZONE')}
 const lat=draft.latitude,lon=draft.longitude;
 if((lat===null)!==(lon===null)||lat!==null&&(!Number.isFinite(lat)||lat< -90||lat>90)||lon!==null&&(!Number.isFinite(lon)||lon< -180||lon>180))throw Error('INVALID_EVENT_COORDINATES');
 if(!draft.publicContactConsent&&(draft.publicContactName||draft.publicContactPhone))throw Error('PUBLIC_CONTACT_CONSENT_REQUIRED');
 return draft;
}
/** Public payload whitelist: never serialize private responsible fields. */
export function publicTemporaryEvent(draft:TemporaryEventDraft) {
 return {title:draft.title,description:draft.description,countryCode:draft.countryCode,
  province:draft.province,district:draft.district,corregimiento:draft.corregimiento,
  reference:draft.reference,startsOn:draft.startsOn,endsOn:draft.endsOn,
  timezone:draft.timezone,hours:draft.hours,latitude:draft.latitude,longitude:draft.longitude,
  ...(draft.publicContactConsent?{publicContactName:draft.publicContactName,publicContactPhone:draft.publicContactPhone}:{})};
}
/** Generate an unguessable collision suffix server-side; the DB unique constraint remains authoritative. */
export function eventSlug(title:string,suffix:string):string {
 const stem=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60).replace(/-$/,'')||'evento';
 if(!/^[a-f0-9]{16,64}$/.test(suffix))throw Error('INVALID_RANDOM_SUFFIX');
 return stem+'-'+suffix;
}
