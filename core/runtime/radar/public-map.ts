import {commercialOpenStatus} from "./ui/commercial-details.js";
import { countries, validCoordinates, currentActivity, visiblePin, type Country, type Report, type Pin } from "./domain";
export type Bounds = { west:number; south:number; east:number; north:number };
export type Establishment = { id:string; name:string; category:string; country:Country; latitude:number; longitude:number; published:boolean; verifiedOwner?:boolean; reports:readonly Report[]; registrationProfile?:import("./registration").RegistrationProfile; annualUntil?:number; campaign?:{kind:Exclude<Pin,"normal">;startsAt:number;endsAt:number;featuredUntil?:number;liveUntil?:number}; details?:{hours:Record<string,string>;quantity:number|null;unit:string;updatedAt:number|null}; digitalAddress?:{publicUrl:string; publiclyVisible:boolean; residential:boolean; active:boolean} };
export function validateBounds(b:Bounds):boolean {
 return validCoordinates(b.south,b.west) && validCoordinates(b.north,b.east) && b.south<b.north && b.west!==b.east;
}
function inBounds(e:Establishment,b:Bounds):boolean {
 return e.latitude>=b.south && e.latitude<=b.north && (b.west<b.east ? e.longitude>=b.west && e.longitude<=b.east : e.longitude>=b.west || e.longitude<=b.east);
}
function addressLink(a:Establishment["digitalAddress"]):string|null {
 if (!a?.publiclyVisible || a.residential || !a.active) return null;
 try { const u=new URL(a.publicUrl); return u.protocol==="https:" && !u.username && !u.password && (!u.port || u.port==="443") && ["direcciones507.com","www.direcciones507.com","direcciones.lat","www.direcciones.lat"].includes(u.hostname) ? u.href : null; } catch {return null;}
}
// Inputs must come from authorized server-side records, never client-supplied visibility flags.
export function publicFeatures(rows:readonly Establishment[], bounds:Bounds, country:Country, now:number, commercialEnabled=false, commercialModel=false) {
 if (!validateBounds(bounds) || !countries.includes(country)) throw new RangeError("Invalid map query");
 return {type:"FeatureCollection" as const,features:rows.filter(e=>e.published && e.country===country && validCoordinates(e.latitude,e.longitude) && inBounds(e,bounds)).slice(0,1000).map(e=>{
 const report=currentActivity(e.reports,now);
 const pin=visiblePin(e.campaign??null,now,commercialEnabled);
 const annualUntil=e.annualUntil&&e.annualUntil>now?e.annualUntil:null;
 const digitalAddressUrl=addressLink(e.digitalAddress);
 const geometry={type:"Point" as const,coordinates:[e.longitude,e.latitude]};
 if(commercialModel){
  const full=pin!=="normal"||annualUntil!==null;
  const profile=e.registrationProfile;
  const phone=profile?.phone&&/^[+0-9 ()-]{5,32}$/.test(profile.phone)?profile.phone:null;
  const status=commercialOpenStatus({country:e.country,details:e.details,registrationProfile:profile},new Date(now));
  const basic={name:e.name,category:e.category,pin,phone,openStatus:status==="Cierra pronto"?"Abierto ahora":status,commercialModel:true,corporate:!!digitalAddressUrl,...(digitalAddressUrl?{digitalAddressUrl}:{})};
  if(!full)return {type:"Feature" as const,id:e.id,geometry,properties:basic};
  const granted=(timestamp?:number)=>timestamp&&timestamp>now?timestamp:null;
  return {type:"Feature" as const,id:e.id,geometry,properties:{...basic,annualUntil,country:e.country,
   featuredUntil:commercialEnabled?granted(e.campaign?.featuredUntil??(e.campaign?.kind==="featured"?e.campaign.endsAt:undefined)):null,
   liveUntil:commercialEnabled?granted(e.campaign?.liveUntil??(e.campaign?.kind==="live"?e.campaign.endsAt:undefined)):null,
   ...(profile?{registrationProfile:{description:profile.description,whatsapp:profile.whatsapp,hours:profile.hours,
    socials:profile.socials.filter(value=>{try{const host=new URL(value).hostname.replace(/^www\./,"");return ["facebook.com","instagram.com","tiktok.com","youtube.com","youtu.be","x.com","twitter.com","linkedin.com","pinterest.com"].some(domain=>host===domain||host.endsWith("."+domain));}catch{return false;}}),capacity:profile.capacity}}:{}),
   details:e.details?{hours:e.details.hours,quantity:e.details.quantity,unit:e.details.unit}:null}};
 }
 return {type:"Feature" as const,id:e.id,geometry:{type:"Point" as const,coordinates:[e.longitude,e.latitude]},properties:{...(e.verifiedOwner===true?{verifiedOwner:true}:{}),name:e.name,category:e.category,pin:visiblePin(e.campaign??null,now,commercialEnabled),featuredUntil:commercialEnabled?(e.campaign?.featuredUntil??(e.campaign?.kind==="featured"?e.campaign.endsAt:null)):null,liveUntil:commercialEnabled?(e.campaign?.liveUntil??(e.campaign?.kind==="live"?e.campaign.endsAt:null)):null,country:e.country,...(e.registrationProfile?{registrationProfile:e.registrationProfile}:{}),details:e.details??null,activity:report?.state??"unknown",reportedAt:report?.createdAt??null,source:report?.source??null,digitalAddressUrl:addressLink(e.digitalAddress)}};
 })};
}
