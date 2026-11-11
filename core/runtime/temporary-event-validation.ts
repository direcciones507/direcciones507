/** Validación aislada para Dirección Temporal. Sin efectos en los planes existentes. */
export type TemporaryEventDraft={
 eventName:string; responsibleName:string; responsiblePhone:string; responsibleEmail:string;
 publicContactName:string; publicContactPhone:string|null; publishPublicPhone:boolean;
 startDate:string; endDate:string; countryCode:string; reference:string; description:string;
 latitude:number;longitude:number; photoCount:number;
};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function dateDay(value:unknown):number{
 if(typeof value!=='string'||!datePattern.test(value))throw Error('INVALID_EVENT_DATE');
 const ms=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw Error('INVALID_EVENT_DATE');
 return Math.floor(ms/86400000);
}
function str(raw:Record<string,unknown>,key:string,max:number,required=true){
 const v=raw[key];if(typeof v!=='string')throw Error('INVALID_'+key.toUpperCase());
 const text=v.trim();if(text.length>max||(required&&!text))throw Error('INVALID_'+key.toUpperCase());return text;
}
export function validateTemporaryEventDraft(raw:unknown):TemporaryEventDraft{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_TEMPORARY_EVENT');
 const v=raw as Record<string,unknown>;
 const startDate=str(v,'startDate',10),endDate=str(v,'endDate',10);
 const days=dateDay(endDate)-dateDay(startDate)+1;
 if(days<1||days>30)throw Error('INVALID_EVENT_DURATION');
 const responsibleEmail=str(v,'responsibleEmail',160);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail))throw Error('INVALID_RESPONSIBLE_EMAIL');
 const responsiblePhone=str(v,'responsiblePhone',30);
 const publicContactName=str(v,'publicContactName',160);
 const publishPublicPhone=v.publishPublicPhone===true;
 if(v.publishPublicPhone!==true&&v.publishPublicPhone!==false)throw Error('INVALID_PUBLIC_PHONE_CONSENT');
 const publicContactPhone=publishPublicPhone?str(v,'publicContactPhone',30):null;
 const latitude=v.latitude,longitude=v.longitude;
 if(typeof latitude!=='number'||!Number.isFinite(latitude)||latitude < -90||latitude>90||typeof longitude!=='number'||!Number.isFinite(longitude)||longitude < -180||longitude>180)throw Error('INVALID_COORDINATES');
 const photoCount=v.photoCount;
 if(!Number.isInteger(photoCount)||photoCount<1||photoCount>3)throw Error('INVALID_PHOTO_COUNT');
 return {eventName:str(v,'eventName',160),responsibleName:str(v,'responsibleName',160),responsiblePhone,responsibleEmail,publicContactName,publicContactPhone,publishPublicPhone,startDate,endDate,countryCode:str(v,'countryCode',2),reference:str(v,'reference',1000),description:str(v,'description',4000,false),latitude,longitude,photoCount};
}
/** El día posterior al evento está incluido; UTC es solo fecha de referencia.
 * Para producción convertir medianoche de la zona horaria local del evento. */
export function temporaryEventExpiryCalendarDate(endDate:string):string{
 const day=dateDay(endDate);return new Date((day+2)*86400000).toISOString().slice(0,10);
}
export const TEMPORARY_EVENT_PRICE_CENTS=799;
