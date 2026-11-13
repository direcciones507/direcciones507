/**
 * Temporary event lifecycle policy. Pure functions for use by persistence,
 * payment callback, public route and scheduled expiration worker.
 * No network calls and no implicit publication.
 */
export type TemporaryEventState='DRAFT'|'AWAITING_PAYMENT'|'ACTIVE'|'EXPIRED'|'CANCELLED';
const dayPattern=/^\d{4}-\d{2}-\d{2}$/;
function assertDate(date:string):void {
 if(!dayPattern.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||
 new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('INVALID_EVENT_DATE');
}
function assertZone(zone:string):void {
 try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format()}catch{throw Error('INVALID_EVENT_TIMEZONE')}
}
/** Valid for 1 through 60 calendar dates, inclusive. */
export function temporaryEventDuration(startsOn:string,endsOn:string):number {
 assertDate(startsOn);assertDate(endsOn);
 const days=(Date.parse(endsOn+'T00:00:00Z')-Date.parse(startsOn+'T00:00:00Z'))/86400000+1;
 if(days<1||days>60)throw Error('EVENT_DURATION_OUT_OF_RANGE');
 return days;
}
/**
 * Local midnight on the second calendar day after endsOn.
 * A 2026-11-10 end date expires at 2026-11-12 00:00 local time.
 * Determine local date/time via Intl, avoiding host timezone assumptions.
 */
export function eventIsExpired(endsOn:string,timezone:string,now:Date):boolean {
 assertDate(endsOn);assertZone(timezone);
 if(Number.isNaN(now.valueOf()))throw Error('INVALID_NOW');
 const limit=new Date(Date.parse(endsOn+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 const localDate=p.year+'-'+p.month+'-'+p.day;
 return localDate>=limit;
}
export function canPublishTemporaryEvent(args:{
 status:TemporaryEventState;paymentOrderId:string|null;paymentConfirmedAt:string|null;
 startsOn:string;endsOn:string;timezone:string;now:Date;
 photoCount:number;hasPrimaryPhoto:boolean;
}):boolean {
 temporaryEventDuration(args.startsOn,args.endsOn);
 assertZone(args.timezone);
 return args.status==='AWAITING_PAYMENT'&&!!args.paymentOrderId&&!!args.paymentConfirmedAt&&
 Number.isFinite(Date.parse(args.paymentConfirmedAt))&&args.photoCount>=1&&args.photoCount<=3&&
 args.hasPrimaryPhoto&&!eventIsExpired(args.endsOn,args.timezone,args.now);
}
/** Use this in read paths as well as expiration jobs, so a delayed job cannot leak an expired event. */
export function publicEventStatus(status:TemporaryEventState,endsOn:string,timezone:string,now:Date):'ACTIVE'|'EXPIRED'|'UNPUBLISHED' {
 if(status!=='ACTIVE')return status==='EXPIRED'?'EXPIRED':'UNPUBLISHED';
 return eventIsExpired(endsOn,timezone,now)?'EXPIRED':'ACTIVE';
}

/** Price for a new quote; stored previous orders keep their original amount. */
export function temporaryEventQuote(startsOn:string,endsOn:string){
 const days=temporaryEventDuration(startsOn,endsOn);
 return {days,amountCents:days<=30?1299:1999,currency:'USD' as const};
}
